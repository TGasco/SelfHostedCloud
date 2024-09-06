# My Self-Hosted Cloud Service

This is a self-hosted cloud service built using Node.js, Express, and various other libraries. It provides a secure platform to store and manage files with an easy-to-use web interface.

The service supports uploading, downloading, and managing files and folders. It also includes search functionality and file preview for common file types.

## Features

- Secure connection with HTTPS
- Support for uploading, downloading, and managing files (drag and drop or file picker interface)
- Search functionality for files and folders
- File preview for common file types (images, text-based, PDFs)
- Secure User authentication with rotating JWT tokens
- CORS configuration for cross-origin requests
- Compression middleware for faster transfer speeds

## Prerequisites

Before you begin, make sure you have the following software installed on your machine:

- Node.js 14.x or newer
- npm (usually comes with Node.js)

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/TGasco/SelfHostedCloud.git
   ```

2. Change directory to the project root:

   ```
   cd my-self-hosted-cloud-service
   ```

3. Install the dependencies:

   ```
   npm install
   ```

4. Generate a self-signed SSL certificate for local development (replace `<path_to_project>` with the actual path to your project):

   ```
   openssl req -nodes -new -x509 -keyout <path_to_project>/server.key -out <path_to_project>/server.cert
   ```

   _Note: This certificate is only for local development. For production use, you should obtain a valid SSL certificate from a trusted Certificate Authority (CA)._

5. Start the server:

   ```
   npm start
   ```

   The server will be running at `https://localhost:8081`.

## Configuration

You can customize the following configurations in the `server.js` file:

- Change the `PORT` constant to modify the port on which the server listens (default: 8081)
- Update the `origin` array in the CORS middleware configuration to allow requests from other domains (default: `https://localhost:8081`)

## Usage

Visit `https://localhost:8081` in your browser to access the web interface. You can upload, download, and manage your files through this interface.

Files are stored on the host device, at a specified location (default '~/MyCloudDrive'). This can be changed to a location of your choice when creating an account.

Files can be uploaded using the web interface via drag and drop or using the file picker. You can also search for files and folders using the search bar.

File management options are accessible by right-clicking on a file or folder (Long press on touch-based devices). You can rename, delete, or download files and folders using these options.

## Contributing

Feel free to open issues and submit pull requests to help improve the project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.