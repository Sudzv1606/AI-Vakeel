import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '@/lib/config';
import { SessionManager } from '@/lib/session-manager';
import { PipelineOrchestrator } from '@/lib/orchestrator';
import { SSEEmitter } from '@/lib/sse-emitter';
import { OpenRouterClient } from '@/lib/openrouter-client';
import { KnowledgeBaseClient } from '@/lib/knowledge-base';
import { ArzdarAgent } from '@/lib/agents/arzdar';
import { VivechakAgent } from '@/lib/agents/vivechak';
import { ShodhakAgent } from '@/lib/agents/shodhak';
import { MunshiAgent } from '@/lib/agents/munshi';
import { NyayadootAgent } from '@/lib/agents/nyayadoot';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * POST /api/pipeline
 * Initiates a new pipeline execution and returns an SSE stream of events.
 * The response is a streaming SSE response that stays open until the pipeline completes.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { problemDescription } = body;

    if (!problemDescription || typeof problemDescription !== 'string') {
      return NextResponse.json(
        { error: 'problemDescription is required and must be a string' },
        { status: 400 }
      );
    }

    const length = problemDescription.length;
    if (length < 50 || length > 5000) {
      return NextResponse.json(
        {
          error: `Problem description must be between 50 and 5000 characters. Received ${length} characters.`,
        },
        { status: 400 }
      );
    }

    // Load config
    const config = loadConfig();

    // Get authenticated user
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create Supabase client (service role for DB operations)
    const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

    // Create session
    const sessionManager = new SessionManager(supabase);
    const session = await sessionManager.create(problemDescription, user.id);

    // Create SSE emitter
    const sseEmitter = new SSEEmitter();

    // Create OpenRouter client
    const openRouterClient = new OpenRouterClient({
      apiKey: config.openRouter.apiKey,
      model: config.openRouter.model,
      maxInputTokens: config.openRouter.maxInputTokens,
      maxOutputTokens: config.openRouter.maxOutputTokens,
      timeoutMs: config.openRouter.timeoutMs,
      maxRetries: config.openRouter.maxRetries,
    });

    // Create Knowledge Base client
    const kbClient = new KnowledgeBaseClient(supabase);

    // Create agents
    const agents = {
      arzdar: new ArzdarAgent(openRouterClient),
      vivechak: new VivechakAgent(openRouterClient),
      shodhak: new ShodhakAgent(kbClient),
      munshi: new MunshiAgent(openRouterClient),
      nyayadoot: new NyayadootAgent(openRouterClient),
    };

    // Create orchestrator
    const orchestrator = new PipelineOrchestrator(
      {
        maxExecutionTimeMs: config.pipeline.maxExecutionTimeMs,
        sessionId: session.id,
      },
      agents,
      sseEmitter as any,
      sessionManager
    );

    // Start pipeline in background (don't await — let it stream)
    orchestrator.execute(problemDescription).then(() => {
      console.log(`Pipeline ${session.id} completed`);
    }).catch((err) => {
      console.error(`Pipeline ${session.id} error:`, err);
    });

    // Return the SSE stream
    return new Response(sseEmitter.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Session-Id': session.id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Pipeline start error:', message);
    return NextResponse.json(
      { error: 'Failed to start pipeline', details: message },
      { status: 500 }
    );
  }
}
