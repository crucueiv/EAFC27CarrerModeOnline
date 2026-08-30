import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = async () => {
        try {
          const count = await prisma.emailMessage.count({
            where: { userId, read: false },
          });
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "UNREAD_COUNT", count })}\n\n`)
          );
        } catch {
          // Silently handle errors
        }
      };

      await sendEvent();

      const interval = setInterval(sendEvent, 15_000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
