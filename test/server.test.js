import chai, { expect as _expect, assert as _assert, should as _should } from 'chai';
import sinonChai from 'sinon-chai';
const expect = _expect;
const assert = _assert;
const should = _should();
import { describe as _describe, it as _it } from 'mocha';
import express from 'express';
const describe = _describe;
const it = _it;
chai.use(sinonChai);
describe('Express Middleware', () => {
  it('should use body parser middleware to parse request body', () => {
    expect(chai.use).to.have.been.calledWith(bodyParser.urlencoded({ extended: false }));
    expect(chai.use).to.have.been.calledWith(bodyParser.json());
  });

  it('should use cookie parser middleware', () => {
    expect(chai.use).to.have.been.calledWith(cookieParser());
  });

  it('should use compression middleware', () => {
    expect(chai.use).to.have.been.calledWith(compression());
  });

  it('should use CORS middleware', () => {
    expect(chai.use).to.have.been.calledWith(cors({
      origin: ["https://localhost:8081"],
      credentials: true,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }));
  });

  it('should use helmet middleware', () => {
    expect(chai.use).to.have.been.calledWith(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'", "blob:",], // Allow content from the same origin
          scriptSrc: [
            "'self'",
            "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.5.141/build/", // Allow access to pdfjs library
            "https://cdn.jsdelivr.net/npm/prismjs@1.27.0/"
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net/npm/prismjs@1.27.0/"],
          imgSrc: ["'self'", "data:", "blob:"], // Allow images from the same origin and data URIs
          fontSrc: ["'self'"],
          workerSrc: [
            "'self'",
            "blob:",
            "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.5.141/build/", // Allow access to pdfjs library
            "https://cdn.jsdelivr.net/npm/prismjs@1.27.0/"
          ],
        },
      },
    }));
  });

  it('should serve favicon', () => {
    expect(chai.use).to.have.been.calledWith(serveFavicon(join(publicPath, "favicon.ico")));
  });

  it('should set Content-Type header for .js files', () => {
    expect(res.setHeader).to.have.been.calledWith('Content-Type', 'application/javascript');
  });

  it('should use express static middleware', () => {
    expect(chai.use).to.have.been.calledWith(express.static(publicPath));
  });

  it('should use router middleware for all requests', () => {
    expect(chai.use).to.have.been.calledWith(router);
  });
});

describe('HTTPS Server', () => {
  it('should create an HTTPS server for localhost', () => {
    expect(https.createServer).to.have.been.calledWith(sslOptions, app);
  });

  it('should listen on port 8081', () => {
    expect(httpsServer.listen).to.have.been.calledWith(PORT);
  });
});

describe('Database Setup', () => {
  it('should call setup()', () => {
    expect(setup).to.have.been.called;
  });

  it('should call updateAllCollections()', () => {
    expect(updateAllCollections).to.have.been.called;
  });
});
