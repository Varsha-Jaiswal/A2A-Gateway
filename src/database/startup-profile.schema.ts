import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type StartupProfileDocument = StartupProfile & Document;

@Schema({ timestamps: true, strict: false }) // strict: false allows dynamic A2A payloads
export class StartupProfile {
  @Prop({ required: true, unique: true })
  agent_id: string;

  @Prop({ required: true })
  latest_session_id: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  extracted_data: Record<string, any>;
  
  @Prop({ type: [{ role: String, content: String }], default: [] })
  conversation_history: Array<{ role: string; content: string }>;
}

export const StartupProfileSchema = SchemaFactory.createForClass(StartupProfile);
