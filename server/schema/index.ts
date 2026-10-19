import { builder } from './builder'
import './statistics'
import './types/Project'
import './types/Task'
import './types/TaskWorkLog'
import './types/Timer'

import './types/User'
import './types/EthAccount'
import './types/KBConcept'
import './types/files'
import './types/imageGeneration'
import './types/ChatMessage'
import './types/ChatDialogue'

import './types/Transaction'
import './types/Balance'
import './types/Telegram'

export const schema = builder.toSchema()
