/** The body submitted to `POST /contact/messages`. */
export interface ContactMessagePayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/** The persisted message returned by `POST /contact/messages`. */
export interface ContactMessageResult {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}
