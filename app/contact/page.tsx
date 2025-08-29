import ContactForm from '@/components/ContactForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contact | PharmaGtN',
  description: 'Neem contact op met PharmaGtN voor een demo of vragen.'
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-6">Contact</h1>
      <p className="text-gray-600 mb-8 max-w-2xl">
        Vul het formulier in en we komen binnen 1 werkdag bij u terug.
      </p>
      <ContactForm />
    </section>
  );
}
