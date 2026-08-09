import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

import { SiteShell, PageContainer } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessage } from "@/lib/api/contact";
import {
  validateContactForm,
  type ContactFormErrors,
  type ContactFormState,
} from "@/lib/contact-form";
import { Seo } from "@/components/shared/seo";

const EMPTY_FORM: ContactFormState = { name: "", email: "", subject: "", message: "" };

function ContactPage() {
  const [form, setForm] = useState<ContactFormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<ContactFormErrors>({});
  const [pending, setPending] = useState(false);

  function updateField(field: keyof ContactFormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateContactForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setPending(true);
    try {
      await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      toast.success("Message sent", {
        description: "Thanks for reaching out. We'll get back to you soon.",
      });
      setForm(EMPTY_FORM);
      setFieldErrors({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to send your message.");
    } finally {
      setPending(false);
    }
  }

  return (
    <SiteShell>
      <Seo
        title="Contact Us — Ethio Exchange"
        description="Questions about our data, API access, or partnerships? Send us a message and our team will get back to you."
      />
      <PageContainer>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight">Get in Touch</h1>
          <p className="mt-3 text-muted-foreground">
            Questions about our data, API access, or partnerships? Send us a message and our team
            will get back to you.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          {/* Contact information */}
          <aside className="space-y-4">
            <ContactInfoCard icon={<Mail className="size-5 text-primary" />} label="Email">
              <a href="mailto:ethioexchanges@gmail.com" className="hover:underline">
                ethioexchanges@gmail.com
              </a>
            </ContactInfoCard>
            <ContactInfoCard icon={<Phone className="size-5 text-primary" />} label="Phone">
              <a href="tel:+251929843572" className="hover:underline">
                +251 929843572
              </a>
            </ContactInfoCard>
            <ContactInfoCard
              icon={<MapPin className="size-5 text-primary" />}
              label="Office Address"
            >
              Lebu KAM Building, 2nd Floor, Addis Ababa, Ethiopia
            </ContactInfoCard>
          </aside>

          {/* Contact form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-2xl bg-card border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-6 md:p-8 space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Full Name</Label>
                <Input
                  id="contact-name"
                  name="name"
                  autoComplete="name"
                  placeholder="John Doe"
                  value={form.name}
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
                  onChange={(e) => updateField("name", e.target.value)}
                />
                <FieldError id="contact-name-error" message={fieldErrors.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Email Address</Label>
                <Input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={form.email}
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
                  onChange={(e) => updateField("email", e.target.value)}
                />
                <FieldError id="contact-email-error" message={fieldErrors.email} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-subject">Subject</Label>
              <Input
                id="contact-subject"
                name="subject"
                placeholder="How can we help?"
                value={form.subject}
                disabled={pending}
                aria-invalid={Boolean(fieldErrors.subject)}
                aria-describedby={fieldErrors.subject ? "contact-subject-error" : undefined}
                onChange={(e) => updateField("subject", e.target.value)}
              />
              <FieldError id="contact-subject-error" message={fieldErrors.subject} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea
                id="contact-message"
                name="message"
                rows={6}
                placeholder="Tell us more about your inquiry..."
                value={form.message}
                disabled={pending}
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={fieldErrors.message ? "contact-message-error" : undefined}
                onChange={(e) => updateField("message", e.target.value)}
              />
              <FieldError id="contact-message-error" message={fieldErrors.message} />
            </div>

            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pending ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </div>
      </PageContainer>
    </SiteShell>
  );
}

function ContactInfoCard({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-5 flex items-start gap-4">
      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          {label}
        </p>
        <div className="text-sm font-semibold mt-1 break-words">{children}</div>
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

export default ContactPage;
