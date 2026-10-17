import { builder } from './builder'
import './statistics'

import './types/User'
import './types/EthAccount'
import './types/KBConcept'
import './types/files'
import './types/imageGeneration'
import './types/ChatMessage'
import './types/ChatDialogue'

export const schema = builder.toSchema()
