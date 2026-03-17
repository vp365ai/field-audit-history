import type { Config } from "jest";

const config: Config = {
    testEnvironment: "jsdom",
    transform: {
        "^.+\\.tsx?$": [
            "ts-jest",
            {
                tsconfig: {
                    jsx: "react",
                    esModuleInterop: true,
                    strict: true,
                    moduleResolution: "node",
                    target: "ES2020",
                    module: "commonjs",
                    types: ["jest", "@testing-library/jest-dom", "powerapps-component-framework"],
                },
            },
        ],
    },
    moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
    testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
    setupFilesAfterEnv: ["<rootDir>/FieldAuditHistory/__tests__/setup.ts"],
    collectCoverageFrom: [
        "FieldAuditHistory/**/*.{ts,tsx}",
        "!FieldAuditHistory/generated/**",
        "!FieldAuditHistory/index.ts",
        "!FieldAuditHistory/**/__tests__/**",
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};

export default config;
