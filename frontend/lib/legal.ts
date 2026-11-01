import { PHONE_DISPLAY } from "@/lib/contact";
import type { Locale } from "@/messages";

type Section = { heading: string; body: string[] };

export const privacySections: Record<Locale, Section[]> = {
  es: [
    {
      heading: "Qué se guarda",
      body: [
        "El nombre, el correo, el teléfono y las notas que escribas al reservar. Si creas una cuenta, también el nombre y el correo. Las contraseñas se guardan cifradas con Argon2id: nadie en la casa puede leerlas.",
      ],
    },
    {
      heading: "Para qué",
      body: [
        "Solo para gestionar la reserva y avisarte si algo cambia. No hay boletines, ni publicidad, ni cesión de datos a terceros.",
      ],
    },
    {
      heading: "Cuánto tiempo",
      body: [
        "Las reservas se conservan seis meses y después se borran. Las cuentas, hasta que pidas cerrarlas.",
      ],
    },
    {
      heading: "Cookies",
      body: [
        "Dos cookies técnicas: la de sesión y la de protección CSRF. Ninguna sirve para rastrearte ni para publicidad.",
      ],
    },
    {
      heading: "Tus derechos",
      body: [
        `Puedes pedir una copia, corregir un dato o borrar tu cuenta llamando al ${PHONE_DISPLAY} o escribiendo por WhatsApp. Contestamos el mismo día.`,
      ],
    },
  ],
  en: [
    {
      heading: "What we keep",
      body: [
        "The name, email, phone number and notes you enter when booking. If you create an account, your name and email as well. Passwords are stored hashed with Argon2id: nobody in the house can read them.",
      ],
    },
    {
      heading: "What for",
      body: [
        "Only to manage the booking and let you know if something changes. No newsletters, no advertising, no data passed to third parties.",
      ],
    },
    {
      heading: "How long",
      body: [
        "Bookings are kept for six months and then deleted. Accounts stay until you ask us to close them.",
      ],
    },
    {
      heading: "Cookies",
      body: [
        "Two technical cookies: the session one and the CSRF one. Neither is used for tracking or advertising.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        `You can ask for a copy, correct a detail or delete your account by calling ${PHONE_DISPLAY} or messaging us on WhatsApp. We answer the same day.`,
      ],
    },
  ],
  fr: [
    {
      heading: "Ce qui est conservé",
      body: [
        "Le nom, le courriel, le téléphone et les remarques saisies lors de la réservation. Si vous créez un compte, le nom et le courriel également. Les mots de passe sont conservés hachés avec Argon2id : personne dans la maison ne peut les lire.",
      ],
    },
    {
      heading: "Pour quoi faire",
      body: [
        "Uniquement pour gérer la réservation et vous prévenir en cas de changement. Pas de lettre d'information, pas de publicité, aucune donnée transmise à des tiers.",
      ],
    },
    {
      heading: "Combien de temps",
      body: [
        "Les réservations sont conservées six mois puis supprimées. Les comptes restent jusqu'à votre demande de fermeture.",
      ],
    },
    {
      heading: "Cookies",
      body: [
        "Deux cookies techniques : celui de session et celui de protection CSRF. Aucun ne sert au suivi ni à la publicité.",
      ],
    },
    {
      heading: "Vos droits",
      body: [
        `Vous pouvez demander une copie, corriger une donnée ou supprimer votre compte en appelant le ${PHONE_DISPLAY} ou en nous écrivant sur WhatsApp. Nous répondons le jour même.`,
      ],
    },
  ],
  ru: [
    {
      heading: "Что хранится",
      body: [
        "Имя, почта, телефон и пожелания, которые вы указываете при бронировании. Если вы создаёте аккаунт — также имя и почта. Пароли хранятся в виде хеша Argon2id: прочитать их не может никто в доме.",
      ],
    },
    {
      heading: "Зачем",
      body: [
        "Только чтобы вести бронь и предупредить, если что-то изменится. Никаких рассылок, рекламы и передачи данных третьим лицам.",
      ],
    },
    {
      heading: "Сколько хранится",
      body: [
        "Брони хранятся шесть месяцев, затем удаляются. Аккаунты — до тех пор, пока вы не попросите их закрыть.",
      ],
    },
    {
      heading: "Cookies",
      body: [
        "Две технические cookie: сессионная и защитная CSRF. Ни одна не используется для слежки или рекламы.",
      ],
    },
    {
      heading: "Ваши права",
      body: [
        `Можно запросить копию, исправить данные или удалить аккаунт, позвонив по номеру ${PHONE_DISPLAY} или написав нам в WhatsApp. Отвечаем в тот же день.`,
      ],
    },
  ],
};

export type PhotoCredit = {
  title: string;
  author: string;
  license: string;
  licenseUrl: string;
};

/**
 * Las cinco fotografías del sitio vienen de Wikimedia Commons.
 * La atribución se muestra aquí porque las licencias CC BY-SA la exigen.
 */
export const photoCredits: PhotoCredit[] = [
  {
    title: "Tomahawk over fire",
    author: "Sebastiaan Broekhoven",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    title: "Dry-aging room",
    author: "Filipe Fortes",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
  },
  {
    title: "Table at dusk",
    author: "PattayaPatrol",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
  {
    title: "Bar cocktails",
    author: "Cocktailmarler",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
  {
    title: "Old Fashioned",
    author: "Jack Oughton",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
];
