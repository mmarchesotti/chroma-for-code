# Codebase Agent

A Retrieval-Augmented Generation (RAG) agent built with TypeScript and Next.js, designed to analyze, search, and answer questions about local Git repositories. This agent utilizes ChromaDB for vector storage and supports both OpenAI and Gemini models for reasoning and embeddings.

## Features

* **Autonomous Planning**: Uses an LLM-driven planning phase to break down user queries into actionable steps.
* **Self-Correction**: Evaluates progress after each step and can autonomously revise its plan if new information is discovered or a step fails.
* **Multi-Tool Search**: Equipped with a suite of specialized tools:
* **Semantic Search**: Vector-based search using Gemini embeddings.
* **Full-Text & Regex Search**: Traditional keyword and pattern matching.
* **Symbol Search**: Targeted searching for code symbols.
* **File Retrieval**: Direct access to file contents.
* **Shell Execution**: Ability to run shell commands to interact with the environment.


* **Repository Indexing**: Automatically walks your local repository, respects `.gitignore` rules, and chunks code for efficient embedding and retrieval.
* **Flexible Model Support**: Integrates with OpenAI and Google Gemini via a provider-based architecture.

## Tech Stack

* **Framework**: [Next.js](https://nextjs.org/)
* **Languages**: TypeScript
* **AI/LLM**: AI SDK (Vercel), OpenAI, and Google Generative AI
* **Database**: [ChromaDB](https://www.trychroma.com/)
* **Parsing**: Tree-sitter for intelligent code analysis
* **Utilities**: `simple-git`, `zod`, and `tiktoken`

## Getting Started

### Prerequisites

* Node.js (latest LTS recommended)
* A running ChromaDB instance
* API keys for OpenAI and/or Google Gemini

### Installation

1. Clone the repository.
2. Install dependencies:
```bash
npm install

```


3. Configure your environment variables (create a `.env` file):
```env
# AI Providers
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key

# ChromaDB Configuration
CHROMA_API_KEY=your_chroma_key
CHROMA_TENANT=default_tenant
CHROMA_DATABASE=default_database
```



### Running the Development Server

```bash
npm run dev

```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) to use the chat interface.

## Project Structure

* `/app`: Next.js frontend and API routes.
* `/lib/agent`: Core logic for planning, execution, and evaluation.
* `/lib/indexing`: Repository scanning and vector database synchronization.
* `/lib/model`: LLM provider implementations (Gemini, OpenAI).
* `/lib/tools`: Individual tool definitions used by the agent.
* `/lib/utils`: Code chunking and Git integration utilities.
