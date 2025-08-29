import ContactFormEn from '@/components/ContactFormEn';

export const metadata = {
  title: 'Contact',
  description: 'Get in touch for licenses, onboarding or a demo.',
};

export default function ContactPageEn() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold mb-2">Contact</h1>
      <p className="text-gray-700 mb-8 max-w-2xl">
        Questions about licenses, onboarding or a demo? Leave your details.
      </p>
      <ContactFormEn />
    </section>
  );
}
