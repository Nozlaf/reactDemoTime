# LaunchTimely

A sleek and modern digital clock application built with React, featuring a realistic LCD display and theme switching capabilities.

## Environment Configuration

To run this application, you need to set up your environment variables:

1. Copy the example environment file:
   ```bash
   cp src/config/env.example .env
   ```

2. Edit `.env` and replace `your-client-side-id-here` with your actual LaunchDarkly client-side ID.

3. (Optional) Configure custom LaunchDarkly endpoints by uncommenting and modifying the endpoint URLs if needed.

## Features

- Real-time digital clock display with LCD segment styling
- Dark and light theme support with smooth transitions
- Responsive design that works on all screen sizes
- Realistic LCD segment effects with inactive segment display
- Modern, clean user interface

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/launchtimely.git
   cd launchtimely
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see Environment Configuration above)

4. Start the development server:
   ```bash
   npm start
   ```

The application will open in your default browser at `http://localhost:3000`.

### Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `build` directory.

## Technologies Used

- React
- TypeScript
- CSS3 with modern features
- Create React App
- LaunchDarkly for feature flags

## Version History

- v1.2.0 - Added diagnostic menu (⌘+K) with LaunchDarkly flag details and improved flag handling
- v1.1.1 - Added LaunchDarkly observability plugin with network recording
- v1.1.0 - Added new themes (sunrise/sunset) and feature flags (showTitle, showButton)
- v1.0.1 - Added time-based theme switching with LaunchDarkly integration
- v1.0.0 - Initial release with LCD clock display and theme switching

## License

This project is licensed under the MIT License - see the LICENSE file for details.
