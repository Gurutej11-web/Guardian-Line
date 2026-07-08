import { Speaker } from "./types";

export interface ScenarioLine {
  atMs: number;
  speaker: Speaker;
  text: { en: string; es: string };
  /** Only present on caller lines during scripted playback — feeds the
   * fusion engine a representative voice-authenticity reading so the
   * Trust Meter reacts live without requiring a captured deepfake
   * sample. See README for why this is simulated rather than measured. */
  simulatedSyntheticProbability?: number;
}

export interface DemoScenario {
  id: string;
  name: { en: string; es: string };
  description: { en: string; es: string };
  riskLevel: "benign" | "high-risk";
  lines: ScenarioLine[];
}

export const demoScenarios: DemoScenario[] = [
  {
    id: "grandchild-in-jail",
    riskLevel: "high-risk",
    name: { en: "“Grandchild in jail” scam", es: "Estafa del “nieto en la cárcel”" },
    description: {
      en: "A cloned voice impersonates a grandchild claiming to be arrested, pushing for bail money and secrecy.",
      es: "Una voz clonada se hace pasar por un nieto que dice haber sido arrestado, pide dinero de fianza y secreto.",
    },
    lines: [
      { atMs: 0, speaker: "caller", simulatedSyntheticProbability: 52, text: {
        en: "Grandma? It's me. Please don't be mad.",
        es: "¿Abuela? Soy yo. Por favor no te enojes.",
      }},
      { atMs: 4500, speaker: "you", text: {
        en: "Oh my goodness, what's wrong, sweetie?",
        es: "Ay Dios mío, ¿qué pasa, cariño?",
      }},
      { atMs: 8000, speaker: "caller", simulatedSyntheticProbability: 58, text: {
        en: "I'm in trouble. I was in a car accident and I got arrested. I'm in jail right now.",
        es: "Estoy en problemas. Tuve un accidente de coche y me arrestaron. Estoy en la cárcel ahora.",
      }},
      { atMs: 14000, speaker: "you", text: {
        en: "Arrested? Are you okay? What happened?",
        es: "¿Arrestado? ¿Estás bien? ¿Qué pasó?",
      }},
      { atMs: 18000, speaker: "caller", simulatedSyntheticProbability: 61, text: {
        en: "I'm okay but I need bail money right now or they're not going to let me out.",
        es: "Estoy bien pero necesito dinero de fianza ahora mismo o no me van a dejar salir.",
      }},
      { atMs: 25000, speaker: "caller", simulatedSyntheticProbability: 63, text: {
        en: "Please, you're the only one who can help me. Don't tell mom and dad, they'll be so mad.",
        es: "Por favor, eres la única que puede ayudarme. No le digas a mamá y papá, se van a enojar mucho.",
      }},
      { atMs: 33000, speaker: "you", text: {
        en: "Okay, okay, just tell me what to do.",
        es: "Está bien, está bien, solo dime qué hacer.",
      }},
      { atMs: 37000, speaker: "caller", simulatedSyntheticProbability: 66, text: {
        en: "My lawyer is going to call you. He'll ask you to send the bail money using gift cards, it's the fastest way.",
        es: "Mi abogado te va a llamar. Te va a pedir que envíes el dinero de la fianza con tarjetas de regalo, es lo más rápido.",
      }},
      { atMs: 45000, speaker: "you", text: {
        en: "Gift cards? That seems unusual for bail.",
        es: "¿Tarjetas de regalo? Eso parece inusual para una fianza.",
      }},
      { atMs: 49000, speaker: "caller", simulatedSyntheticProbability: 70, text: {
        en: "I know, I know, but that's how they process it here, please act now, I don't have much time left.",
        es: "Lo sé, lo sé, pero así lo procesan aquí, por favor actúa ahora, no me queda mucho tiempo.",
      }},
      { atMs: 57000, speaker: "caller", simulatedSyntheticProbability: 72, text: {
        en: "Please don't hang up. If you really love me you'll help me right now.",
        es: "Por favor no cuelgues. Si de verdad me quieres, me ayudarás ahora mismo.",
      }},
    ],
  },
  {
    id: "bank-fraud-department",
    riskLevel: "high-risk",
    name: { en: "“Bank fraud department” impersonation", es: "Suplantación del “departamento de fraude bancario”" },
    description: {
      en: "A caller impersonating your bank claims your account is compromised and requests account verification.",
      es: "Alguien que se hace pasar por tu banco afirma que tu cuenta está comprometida y pide verificarla.",
    },
    lines: [
      { atMs: 0, speaker: "caller", simulatedSyntheticProbability: 45, text: {
        en: "Hello, this is the fraud department calling from your bank. We've detected suspicious activity on your account.",
        es: "Hola, le llamamos del departamento de fraude de su banco. Detectamos actividad sospechosa en su cuenta.",
      }},
      { atMs: 6000, speaker: "you", text: {
        en: "Oh no, what kind of activity?",
        es: "Ay no, ¿qué tipo de actividad?",
      }},
      { atMs: 9500, speaker: "caller", simulatedSyntheticProbability: 55, text: {
        en: "Someone tried to withdraw $4,800 in another state. We need to verify your identity immediately to freeze it.",
        es: "Alguien intentó retirar $4,800 en otro estado. Necesitamos verificar su identidad de inmediato para congelarlo.",
      }},
      { atMs: 18000, speaker: "you", text: {
        en: "That's scary. What do you need from me?",
        es: "Eso da miedo. ¿Qué necesita de mí?",
      }},
      { atMs: 22000, speaker: "caller", simulatedSyntheticProbability: 60, text: {
        en: "I'll need your bank account number and routing number to confirm you're the account holder.",
        es: "Necesitaré su número de cuenta y número de ruta para confirmar que usted es el titular.",
      }},
      { atMs: 30000, speaker: "you", text: {
        en: "Shouldn't you already have that on file?",
        es: "¿No debería tener eso ya registrado?",
      }},
      { atMs: 34000, speaker: "caller", simulatedSyntheticProbability: 64, text: {
        en: "This is just a security protocol, ma'am. Please don't hang up, we have to act now before the transfer clears.",
        es: "Es solo un protocolo de seguridad, señora. No cuelgue, tenemos que actuar ahora antes de que se procese la transferencia.",
      }},
      { atMs: 42000, speaker: "caller", simulatedSyntheticProbability: 68, text: {
        en: "It's also best you don't discuss this call with anyone until the case is closed, for confidentiality.",
        es: "También es mejor que no hable de esta llamada con nadie hasta que se cierre el caso, por confidencialidad.",
      }},
    ],
  },
  {
    id: "benign-family-call",
    riskLevel: "benign",
    name: { en: "Everyday family call (control)", es: "Llamada familiar normal (control)" },
    description: {
      en: "A normal, low-risk call between family members — used to show the Trust Meter correctly staying calm.",
      es: "Una llamada normal y de bajo riesgo entre familiares, usada para mostrar que el medidor se mantiene tranquilo.",
    },
    lines: [
      { atMs: 0, speaker: "caller", simulatedSyntheticProbability: 8, text: {
        en: "Hey, it's me! Just calling to see if you're still coming for dinner Sunday.",
        es: "¡Hola, soy yo! Solo llamaba para ver si todavía vienes a cenar el domingo.",
      }},
      { atMs: 5000, speaker: "you", text: {
        en: "Yes! Wouldn't miss it. Should I bring anything?",
        es: "¡Sí! No me lo perdería. ¿Debo traer algo?",
      }},
      { atMs: 9500, speaker: "caller", simulatedSyntheticProbability: 6, text: {
        en: "Maybe just a dessert if you feel like it. No pressure at all.",
        es: "Tal vez solo un postre si te apetece. Sin ninguna presión.",
      }},
      { atMs: 16000, speaker: "you", text: {
        en: "Sounds good, I'll bring the pie you liked last time.",
        es: "Suena bien, traeré el pastel que te gustó la última vez.",
      }},
      { atMs: 21000, speaker: "caller", simulatedSyntheticProbability: 9, text: {
        en: "Perfect, see you around six. Love you, drive safe.",
        es: "Perfecto, nos vemos como a las seis. Te quiero, maneja con cuidado.",
      }},
    ],
  },
];

export function getScenario(id: string): DemoScenario | undefined {
  return demoScenarios.find((s) => s.id === id);
}
