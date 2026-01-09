≥# Cook Mastery

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Cook Mastery is a web app that helps people learn cooking fundamentals by combining curated tutorials and knowledge articles that explain not only how to do something, but why it works. The product focuses on beginner-to-intermediate learning where users can follow recipes but don’t understand principles such as heat control, ingredient function, technique choice, and equipment usage.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Tech Stack

- **Framework**: [Astro 5](https://astro.build/)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
- **Node.js Version**: 22.14.0

## Getting Started Locally

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have Node.js installed. It's recommended to use the version specified in the `.nvmrc` file.

- If you use `nvm` (Node Version Manager):
  ```sh
  nvm use
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/your_username_/your_repository_name.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
3. Start the development server
   ```sh
   npm run dev
   ```

The application will be available at `http://localhost:4321`.

## Available Scripts

In the project directory, you can run:

- `npm run dev`: Runs the app in the development mode.
- `npm run build`: Builds the app for production to the `dist/` folder.
- `npm run preview`: Serves the production build locally for preview.
- `npm run lint`: Lints the project files using ESLint.
- `npm run lint:fix`: Lints and automatically fixes problems in project files.
- `npm run format`: Formats code with Prettier.

## Project Scope

This project is currently in its Minimum Viable Product (MVP) stage.

### Key Features (In Scope)

*   **Authentication**: Secure user signup, login, and session management.
*   **User Progression**: Users can select a cooking level (Beginner, Intermediate, Experienced) and track their progress.
*   **Content**: Access to tutorials and articles. Users can mark them as "passed" or "read".
*   **Recommendations**: Content is recommended based on the user's selected level.
*   **Personal Cookbook**: A feature to save and annotate links to external recipes.

### Out of Scope for MVP

*   User-generated content (e.g., publishing tutorials).
*   Social features like comments, ratings, or likes.
*   Advanced search, filtering, or personalized learning paths.
*   Quizzes or other forms of learning validation.
*   Advanced account management features like password reset.

## Project Status

The project is currently under active development, focusing on implementing the core features defined for the MVP.

## License

Distributed under the MIT License.

