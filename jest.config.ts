import type { Config } from "jest"
import nextJest from "next/jest"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: [
    "<rootDir>/src/**/*.test.ts",
    "<rootDir>/src/**/*.test.tsx",
  ],
  collectCoverageFrom: [
    "src/lib/**/*.ts",
    "src/actions/**/*.ts",
    "src/components/**/*.tsx",
    "!src/components/ui/**",
  ],
}

export default createJestConfig(config)
