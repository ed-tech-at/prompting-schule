import { marked } from 'marked';
import { AzureOpenAI } from 'openai';
import { AZURE_API_VERSION, AZURE_KEY, AZURE_URL, AZURE_MODEL } from '$env/static/private';

type azureAiParams = {
  messages: { role: 'developer' | 'user'; content: string }[];
  maxTokens?: number;
  saveToDb: (text: string, usage: { promptTokens?: number; completionTokens?: number }) => Promise<void>;
};

export async function streamAiResponse({ messages, saveToDb, maxTokens = 1000 }: azureAiParams) {
  const azureLLM = new AzureOpenAI({
    apiKey: AZURE_KEY,
    endpoint: AZURE_URL,
    apiVersion: AZURE_API_VERSION
  });

  const stream = await azureLLM.chat.completions.create({
    model: AZURE_MODEL,
    messages,
    temperature: 0.7,
    max_completion_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true }
  });

  let fullText = '';
  let lastChunk = null;
  const encoder = new TextEncoder();

  const streamResponse = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullText += delta;
          controller.enqueue(encoder.encode(delta));
        }
        lastChunk = chunk;
      }

      const usage = {
        promptTokens: lastChunk?.usage?.prompt_tokens,
        completionTokens: lastChunk?.usage?.completion_tokens
      };

      // Sende Footer
      const footer = JSON.stringify({ __footer: true, ...usage });
      controller.enqueue(encoder.encode('\n[__FOOTER__]' + footer));

      controller.close();

      // Save in DB
      await saveToDb(fullText, usage);
    }
  });

  return new Response(streamResponse, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    }
  });
}
