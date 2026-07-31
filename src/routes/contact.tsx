import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { SiteShell, PageContainer } from "@/components/site-shell";


function ContactPage() {
  return (
    <SiteShell>
      <PageContainer>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight">Get in Touch</h1>
          <p className="mt-3 text-muted-foreground">
            Questions about our data, API access, or institutional partnerships? Our team typically responds within 24 hours.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form className="rounded-2xl bg-card border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-6 md:p-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full Name" placeholder="John Doe" />
              <Field label="Email Address" type="email" placeholder="name@example.com" />
            </div>
            <Field label="Subject" placeholder="How can we help?" />
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Message</label>
              <textarea
                rows={6}
                placeholder="Tell us more about your inquiry..."
                className="w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button className="w-full sm:w-auto rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition">
              Send Message
            </button>
          </form>

          <aside className="space-y-4">
            <ContactCard icon={<Mail className="size-5 text-primary" />} label="Email" value="support@ethioexchange.com" />
            <ContactCard icon={<Phone className="size-5 text-primary" />} label="Phone" value="+251 11 555 0103" />
            <ContactCard icon={<MapPin className="size-5 text-primary" />} label="Headquarters" value="Bole Road, Addis Ababa, Ethiopia" />
            <div className="rounded-2xl bg-primary text-primary-foreground p-6">
              <MessageCircle className="size-6" />
              <h3 className="mt-3 font-semibold">Live Chat</h3>
              <p className="text-sm text-primary-foreground/80 mt-1">
                Premium members get instant access to our 24/7 support concierge.
              </p>
            </div>
          </aside>
        </div>
      </PageContainer>
    </SiteShell>
  );
}

function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-surface-low px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

function ContactCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/60 p-5 flex items-start gap-4">
      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className="text-sm font-semibold mt-1">{value}</p>
      </div>
    </div>
  );
}

export default ContactPage;
