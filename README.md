# Data Quality Assistant UI

A modern web application for managing and analyzing data quality rules for database tables.

## Features

- View list of tables in connected database
- View table metadata and schema information
- Configure and manage data quality rules
- Visual indicators for tables with configured rules

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- A backend API that implements the required endpoints

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd data-quality-assistant-ui
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory and configure your API endpoint:
```
REACT_APP_API_URL=http://your-api-url
```

## Development

To start the development server:

```bash
npm start
# or
yarn start
```

The application will be available at `http://localhost:3000`

## API Endpoints

The application expects the following API endpoints:

### Tables
- `GET /api/v1/tables` - Get list of tables
- `GET /api/v1/database/tables/{tableName}/schema` - Get table metadata and schema
- `GET /api/v1/rules` - Get rules for a table
- `POST /api/v1/rules/generate` - Add a new rule
- `DELETE /api/v1/rules/{ruleId}` - Delete a rule
- `GET /api/v1/tables/{tableName}/suggest-rules` - Suggests rule for the table
- `POST /api/v1/tables/{tableName}/apply-suggested-rules` - Apply suggested rule on the table
- `POST /api/v1/rules/execute` - Executes a rule on the table

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

The build output will be in the `build` directory.

## Technologies Used

- React
- TypeScript
- Material-UI (MUI)
- React Query
- React Router
- Axios

## License

MIT 