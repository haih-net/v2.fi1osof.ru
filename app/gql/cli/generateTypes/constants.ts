import path from 'path'

export const gqlAppRoot = 'app'

const CREATE_REEXPORTS = true
const ROOT_DIR = process.cwd()

const GRAPHQL_FOLDER_PATHS: Array<string> = []

const QUERIES_PATH = path.resolve(ROOT_DIR, gqlAppRoot)

const QUERIES_PATTERN = `${QUERIES_PATH.replace(/\\/g, '/')}/**/*.graphql`

const TS_PATTERN = `${QUERIES_PATH.replace(/\\/g, '/')}/**/*.@(ts|tsx)`

const EXCLUDE_FILES: Array<string> = []

const OUTPUT_PATH = path.resolve(ROOT_DIR, `${gqlAppRoot}/gql/generated`)

const PACKAGE_APP_FILE_PATH = path.resolve(
  ROOT_DIR,
  `${gqlAppRoot}/gql/generated/index.ts`,
)

const TYPES_FILE_PATH = path.resolve(
  ROOT_DIR,
  `${gqlAppRoot}/gql/generated/types.ts`,
)

const APOLLO_HELPER_FILE_PATH = path.resolve(
  OUTPUT_PATH,
  `helpers/apollo-helpers.ts`,
)

export {
  ROOT_DIR,
  GRAPHQL_FOLDER_PATHS,
  QUERIES_PATH,
  QUERIES_PATTERN,
  EXCLUDE_FILES,
  OUTPUT_PATH,
  PACKAGE_APP_FILE_PATH,
  TYPES_FILE_PATH,
  APOLLO_HELPER_FILE_PATH,
  TS_PATTERN,
  CREATE_REEXPORTS,
}
