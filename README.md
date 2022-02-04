# 2048 clone

A clone of the [2048 game](https://github.com/gabrielecirulli/2048), written in TypeScript.

### Usage

Source code in `main.ts`.

Prebuilt and HTML skeleton in `dist/`.

Rebuild using `npm install && npx tsc` .

### Some implementation notes

- I strove to use a clean code style, using functional patterns where practical. 'User-defined control structures' have been used to reduce duplication.

- As a convention, methods are only used for functions that mutate object state. Pure functions are declared top-level.
