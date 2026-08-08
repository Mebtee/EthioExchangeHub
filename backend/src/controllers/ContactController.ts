import type { Request, Response } from "express";

import { asyncHandler } from "@/middleware/async-handler";
import type { ContactMessageInput, ContactService } from "@/services/ContactService";
import { successResponse } from "@/utils/api-response";

/**
 * HTTP adapter for the public contact endpoint. Reads the validated body,
 * delegates to the service, and returns the standard envelope. No business
 * logic here.
 */
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  /** Persists a contact message and responds 201 with the stored row. */
  submitMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const message = await this.contactService.submitMessage(req.body as ContactMessageInput);
    successResponse(res, message, "Message received.", 201);
  });
}
