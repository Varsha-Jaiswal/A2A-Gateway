import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

@Processor('a2a_messages')
export class IntakeProcessor extends WorkerHost {
  private readonly logger = new Logger(IntakeProcessor.name);

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`[x] IntakeBot started processing A2A Message Job ID: ${job.id}`);
    const messageDto = job.data;
    const session = messageDto.session_id;

    // 1. Prepare State for LLM
    this.logger.log(`[x] Feeding payload to Kimi 2.5... Payload: ${JSON.stringify(messageDto.payload.text)}`);
    
    // Simulate Kimi 2.5 LLM Evaluation (The "Understanding" Phase)
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    // 2. Mock Kimi 2.5 structured output extracting missing data
    const kimiExtraction = {
      detected_intent: "seed_pitch",
      extracted_metrics: { stage: "Early", sector: "Tech" },
      missing_required_metrics: ["MRR", "Team Size"],
      next_action: "ask_clarifying_questions",
      generated_reply: "Thank you for the pitch. To proceed with Triple A diligence, please provide your current Month-over-Month MRR growth and the size of your engineering team."
    };

    // 3. (Phase 6) Send reply back to Founder Bot via A2A or Telegram
    this.logger.log(`[x] Kimi 2.5 evaluated session ${session}. Missing Data: ${kimiExtraction.missing_required_metrics.join(', ')}`);
    this.logger.log(`[x] Preparing outbound message to Founder Agent: "${kimiExtraction.generated_reply}"`);

    return { success: true, analysis: kimiExtraction };
  }
}
