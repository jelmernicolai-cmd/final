import ContactForm from '@/components/ContactForm';

export const metadata = {
  title: 'Contact',
  description: 'Neem contact op voor licenties, onboarding of een demo.',
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold mb-2">Contact</h1>
      <p className="text-gray-700 mb-8 max-w-2xl">
        Vragen over licenties, onboarding of een demo? Laat je gegevens achter.
      </p>
      <ContactForm />
    </section>
  );
}
