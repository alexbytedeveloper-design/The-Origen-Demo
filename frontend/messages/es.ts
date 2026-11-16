import { ADDRESS, INSTAGRAM_HANDLE, PHONE_DISPLAY } from "@/lib/contact";

export type Dict = {
  meta: { title: string; description: string };
  nav: {
    house: string;
    menu: string;
    fire: string;
    reviews: string;
    events: string;
    book: string;
    account: string;
    skip: string;
    menuOpen: string;
    menuClose: string;
    lang: string;
    label: string;
  };
  hero: {
    headline: string;
    lead: string;
    cta: string;
    secondary: string;
    place: string;
    photoAlt: string;
  };
  house: {
    label: string;
    title: string;
    p1: string;
    p2: string;
    caption: string;
    photoAlt: string;
    sealTop: string;
    sealYear: string;
    addressKey: string;
    addressValue: string;
    hoursKey: string;
    hoursValue: string;
    instagramKey: string;
    instagramValue: string;
  };
  menu: {
    label: string;
    pageTitle: string;
    pageLead: string;
    navLabel: string;
    loading: string;
    error: string;
    retry: string;
    note: string;
    book: string;
    backHome: string;
    priceNote: string;
    indexLabel: string;
    chapterWord: string;
    topLabel: string;
    photoAlt: string;
  };
  fire: {
    label: string;
    title: string;
    p1: string;
    p2: string;
    caption: string;
    photoAlt: string;
    items: { title: string; text: string }[];
  };
  reviews: {
    label: string;
    title: string;
    lead: string;
    datePrefix: string;
    sample: string;
    sampleNote: string;
  };
  bar: {
    label: string;
    title: string;
    copy: string;
    photoAlt: string;
  };
  events: {
    label: string;
    title: string;
    lead: string;
    recurringTitle: string;
    recurring: { title: string; text: string }[];
    monthLabel: string;
    monthTitle: string;
    monthLead: string;
    monthStatus: string;
    monthCta: string;
    slotLabel: string;
    habano: {
      badge: string;
      title: string;
      lead: string;
      meta: string;
      cta: string;
      message: string;
    };
    whatsappMessage: string;
  };
  booking: {
    label: string;
    title: string;
    copy: string;
    hoursKey: string;
    hoursValue: string;
    phoneKey: string;
    phoneValue: string;
    addressKey: string;
    addressValue: string;
    note: string;
    largeGroup: string;
    largeGroupCta: string;
    whatsappCta: string;
    whatsappMessage: string;
    form: {
      date: string;
      time: string;
      guests: string;
      name: string;
      email: string;
      phone: string;
      notes: string;
      notesPlaceholder: string;
      submit: string;
      sending: string;
      successTitle: string;
      successBody: string;
      another: string;
      selectTime: string;
      guestForms: { one: string; few?: string; many?: string; other: string };
      errRequired: string;
      errEmail: string;
      errPhone: string;
      errDate: string;
      errGuests: string;
      errRate: string;
      errGeneric: string;
    };
  };
  whatsapp: {
    label: string;
    message: string;
  };
  auth: {
    title: string;
    sub: string;
    loginTab: string;
    registerTab: string;
    name: string;
    email: string;
    password: string;
    passwordHint: string;
    submitLogin: string;
    submitRegister: string;
    sending: string;
    logout: string;
    close: string;
    greeting: string;
    demo: string;
    errCredentials: string;
    errExists: string;
    errRate: string;
    errWeak: string;
    errGeneric: string;
  };
  footer: {
    claim: string;
    colHouse: string;
    colContact: string;
    colHours: string;
    instagram: string;
    privacy: string;
    credits: string;
    rights: string;
  };
  legal: {
    privacyTitle: string;
    privacyIntro: string;
    creditsTitle: string;
    creditsIntro: string;
    creditsLicense: string;
    back: string;
  };
};

export const es: Dict = {
  meta: {
    title: "The Origen — Piedra caliente y barra en La Habana",
    description:
      "Piedra caliente, producto de mercado y coctelería clásica en Miramar, La Habana. Reservas por teléfono o WhatsApp.",
  },
  nav: {
    house: "Nosotros",
    menu: "Menú",
    fire: "Piedra",
    reviews: "Reseñas",
    events: "Eventos",
    book: "Reservar",
    account: "Acceder",
    skip: "Saltar al contenido",
    menuOpen: "Abrir menú",
    menuClose: "Cerrar menú",
    lang: "Idioma",
    label: "Navegación principal",
  },
  hero: {
    headline: "Sabores que cruzan océanos.",
    lead: "Cortes que se terminan en la mesa sobre piedra caliente, producto de mercado y coctelería clásica. En el corazón de Miramar.",
    cta: "Reservar mesa",
    secondary: "Ver el menú",
    place: "Calle 3ra entre 24 y 26 · Miramar",
    photoAlt: "Corte de res servido sobre piedra caliente",
  },
  house: {
    label: "Nosotros",
    title: "Un lugar para disfrutar.",
    p1: "A dos calles del malecón, un portal de vitrales y un patio de baldosas reciben al visitante. La cocina gira alrededor de la piedra; el resto lo dicta el mercado.",
    p2: "El producto llega del mercado y del puerto; la carne se sella y se termina en la mesa sobre piedra caliente. El menú se ajusta a lo que hay.",
    caption: "La mesa del patio, al final de la tarde.",
    photoAlt: "Mesa larga puesta en el patio interior.",
    sealTop: "Miramar",
    sealYear: "Cuba",
    addressKey: "Dirección",
    addressValue: ADDRESS,
    hoursKey: "Horario",
    hoursValue: "Todos los días · 12:00–00:00",
    instagramKey: "Instagram",
    instagramValue: INSTAGRAM_HANDLE,
  },
  menu: {
    label: "Menú",
    pageTitle: "Menú",
    pageLead:
      "Coctelería, cocina de mercado y cortes que se terminan en la piedra. Una carta que cambia con el día.",
    navLabel: "Secciones del menú",
    loading: "Cargando el menú",
    error: "El menú no cargó. Revisa la conexión e inténtalo otra vez.",
    retry: "Reintentar",
    note: "Precios en USD, impuestos incluidos.",
    book: "Reservar mesa",
    backHome: "Volver al inicio",
    priceNote: "Precios en USD",
    indexLabel: "Índice",
    chapterWord: "Capítulo",
    topLabel: "Inicio del menú",
    photoAlt: "Mesa y menú de The Origen",
  },
  fire: {
    label: "La piedra",
    title: "El punto exacto de la carne sobre tu mesa.",
    p1: "La piedra se calienta antes del servicio y llega a la mesa para que el corte termine de hacerse delante de ti. No hay humo que esconda el punto: se mira, se corta y se come.",
    p2: "Sal marina, pimienta negra y nuestro chimichurri. Lo demás lo hace la piedra.",
    caption: "El corte se elige y se atempera antes de llegar a la piedra.",
    photoAlt: "Corte de res antes de pasar a la piedra caliente",
    items: [
      {
        title: "El sello",
        text: "Se calienta antes del servicio y llega a la mesa para sellar el corte en el último momento.",
      },
      {
        title: "Lo que trae el día",
        text: "Carne, pescado y huerta se eligen cada mañana; el menú se cierra con lo que hay.",
      },
      {
        title: "El punto justo",
        text: "El corte se termina en la mesa, a la vista. Se sirve con papas doradas, ensalada y chimichurri.",
      },
    ],
  },
  reviews: {
    label: "La mesa opina",
    title: "Siempre se habla al final.",
    lead: "Seis mesas, seis noches, seis opiniones.",
    datePrefix: "",
    sample: "Muestra",
    sampleNote:
      "Reseñas de muestra para ver la sección terminada; se sustituirán por las reales al publicar.",
  },
  bar: {
    label: "Coctelería",
    title: "Detrás de la barra, el tiempo se mide en sorbos.",
    copy: "La barra abre a mediodía. El Bodegón, el Golpe Bajo y el Coco Bay son la puerta de entrada; detrás hay un menú largo de clásicos.",
    photoAlt: "Cócteles servidos en la barra",
  },
  events: {
    label: "La noche",
    title: "La noche también suena.",
    lead: "Cantantes invitados, conciertos y noches que se repiten. El programa de noviembre se anunciará pronto.",
    recurringTitle: "Noches que vuelven",
    recurring: [
      {
        title: "Música en vivo",
        text: "Voces y pequeños formatos en el patio, sin escenario de más.",
      },
      {
        title: "Conciertos íntimos",
        text: "Fechas especiales con artistas invitados y aforo corto.",
      },
      {
        title: "Catas y encuentros",
        text: "Ron, habano y conversación alrededor de una mesa larga.",
      },
      {
        title: "Eventos privados",
        text: "Reservamos el espacio para celebraciones y encuentros de empresa.",
      },
    ],
    monthLabel: "Noviembre 2026",
    monthTitle: "La agenda de noviembre.",
    monthLead:
      "Habrá conciertos, invitados y noches especiales. Las fechas y los nombres se publican pronto.",
    monthStatus: "Por confirmar",
    monthCta: "Consultar agenda",
    slotLabel: "Evento por anunciar",
    habano: {
      badge: "Evento especial",
      title: "Habano, ron y sobremesa.",
      lead: "Una noche dedicada al habano, el ron y la conversación, con invitados y una selección especial.",
      meta: "Fecha y detalles por confirmar",
      cta: "Solicitar información",
      message: "Hola, quisiera información sobre el evento del Habano.",
    },
    whatsappMessage: "Hola, quisiera información sobre los eventos de The Origen.",
  },
  booking: {
    label: "Reservas",
    title: "Una mesa para ti.",
    copy: "Reserva por teléfono o WhatsApp. Para grupos grandes, escríbenos y lo organizamos.",
    hoursKey: "Horario",
    hoursValue: "Todos los días\n12:00–00:00",
    phoneKey: "Teléfono",
    phoneValue: PHONE_DISPLAY,
    addressKey: "Dirección",
    addressValue: ADDRESS,
    note: "Abrimos todos los días de 12:00 a 00:00.",
    largeGroup: "¿Venís un grupo grande?",
    largeGroupCta: "Escríbenos por WhatsApp",
    whatsappCta: "Consultar por WhatsApp",
    whatsappMessage: "Hola, quisiera consultar una reserva en The Origen.",
    form: {
      date: "Fecha",
      time: "Hora",
      guests: "Personas",
      name: "Nombre",
      email: "Correo",
      phone: "Teléfono",
      notes: "Notas",
      notesPlaceholder: "Mesa en el patio, cumpleaños, alguna alergia…",
      submit: "Solicitar mesa",
      sending: "Enviando…",
      successTitle: "Mesa solicitada.",
      successBody:
        "Te contactamos para confirmar. Si la mesa no se confirma, vuelve a la lista.",
      another: "Hacer otra reserva",
      selectTime: "Elige una hora",
      guestForms: { one: "persona", other: "personas" },
      errRequired: "Este campo hace falta.",
      errEmail: "Revisa el correo.",
      errPhone: "Un teléfono al que podamos llamar.",
      errDate: "Elige una fecha de hoy en adelante.",
      errGuests: "Elige cuántas personas vienen.",
      errRate: "Demasiadas solicitudes seguidas. Espera unos minutos.",
      errGeneric: "No se pudo enviar. Inténtalo otra vez.",
    },
  },
  whatsapp: {
    label: "Escríbenos por WhatsApp",
    message: "Hola, quisiera información sobre The Origen.",
  },
  auth: {
    title: "Acceso",
    sub: "Para cambiar una reserva o guardar tus mesas.",
    loginTab: "Entrar",
    registerTab: "Crear cuenta",
    name: "Nombre",
    email: "Correo",
    password: "Contraseña",
    passwordHint: "Diez caracteres como mínimo.",
    submitLogin: "Entrar",
    submitRegister: "Crear cuenta",
    sending: "Un momento…",
    logout: "Salir",
    close: "Cerrar",
    greeting: "Hola,",
    demo: "Demo: demo@theorigen.cu · Origen2026!",
    errCredentials: "Correo o contraseña incorrectos.",
    errExists: "Ese correo ya tiene una cuenta.",
    errRate: "Demasiados intentos. Espera unos minutos.",
    errWeak: "La contraseña necesita diez caracteres.",
    errGeneric: "No se pudo completar la operación.",
  },
  footer: {
    claim: "Piedra caliente, barra y Miramar al fondo.",
    colHouse: "Nosotros",
    colContact: "Contacto",
    colHours: "Horario",
    instagram: "Instagram",
    privacy: "Privacidad",
    credits: "Créditos de fotografía",
    rights: "© 2026 The Origen. La Habana.",
  },
  legal: {
    privacyTitle: "Privacidad",
    privacyIntro:
      "Este sitio es una demostración. Los datos que envíes se guardan en una base de datos local y no se comparten con terceros.",
    creditsTitle: "Créditos de fotografía",
    creditsIntro:
      "Las fotografías del sitio proceden de Wikimedia Commons y se usan bajo licencia Creative Commons. Cada imagen conserva la autoría de quien la tomó.",
    creditsLicense: "Licencia",
    back: "Volver al inicio",
  },
};
