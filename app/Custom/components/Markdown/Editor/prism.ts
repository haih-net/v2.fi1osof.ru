import Prism from 'prismjs'

// Lexical's language modules read the global Prism instance during evaluation.
// Importing its CommonJS value here initializes it before those modules execute.
Prism.manual = true
const globals = globalThis as typeof globalThis & { Prism: typeof Prism }
globals.Prism = Prism
