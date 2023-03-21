export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  logLevel: LogLevel = 'info';
  private scope: string;

  constructor({
    scope,
    logLevel,
    enabled = true,
  }: {
    scope: string;
    logLevel?: LogLevel;
    enabled?: boolean;
  }) {
    this.scope = scope;
    if (logLevel) {
      this.logLevel = logLevel;
    }

    if (typeof enabled === 'boolean') {
      if (enabled) {
        localStorage.setItem('Peer-Connect-Logging', 'true');
      } else {
        localStorage.setItem('Peer-Connect-Logging', 'false');
      }
    }
  }

  disable() {
    localStorage.setItem('Peer-Connect-Logging', 'false');
  }

  enable() {
    localStorage.setItem('Peer-Connect-Logging', 'true');
  }

  private formatMessage(logLevel: LogLevel, message: string): string {
    let tag = 'Info';

    if (logLevel == 'error') {
      tag = 'Error';
    } else if (logLevel == 'warn') {
      tag = 'Warning';
    } else if (logLevel == 'debug') {
      tag = 'Debug';
    }

    return `%c${tag}%c %c${this.scope}%c ${message}`;
  }

  private getTagStyle(logLevel: LogLevel): string {
    let tagStyle = `
      padding: 2px 4px; 
      border-radius: 4px; 
      font-weight: bold';
    `;

    if (logLevel == 'error') {
      tagStyle = `
        color: white; 
        background-color: #FF0012;
        ${tagStyle} 
      `;
    } else if (logLevel == 'warn') {
      tagStyle = `
        color: black; 
        background-color: #FFD900;
        ${tagStyle} 
      `;
    } else if (logLevel == 'info') {
      tagStyle = `
        color: white; 
        background-color: #0084B0; 
        ${tagStyle}
      `;
    } else if (logLevel == 'debug') {
      tagStyle = `
        color: white; 
        background-color: #5BE300; 
        ${tagStyle}
      `;
    }

    return tagStyle;
  }

  private log(logLevel: LogLevel, message: string) {
    const scopeStyle = `
      color: white; 
      background-color: #454545; 
      padding: 2px 4px; 
      border-radius: 4px; 
      font-weight: bold';
    `;

    if (localStorage.getItem('Peer-Connect-Logging') === 'true') {
      if (logLevel === 'debug' || logLevel === 'info') {
        console.log(
          this.formatMessage(logLevel, message),
          this.getTagStyle(logLevel),
          '',
          scopeStyle,
          'color: black'
        );
      } else if (logLevel === 'warn') {
        console.warn(
          this.formatMessage(logLevel, message),
          this.getTagStyle(logLevel),
          '',
          scopeStyle,
          'color: black'
        );
      } else if (logLevel === 'error') {
        console.error(
          this.formatMessage(logLevel, message),
          this.getTagStyle(logLevel),
          '',
          scopeStyle,
          'color: black'
        );
      }
    }
  }

  private argsToString(args: any[]): string {
    let message = '';

    for (const arg of args) {
      if (
        typeof arg === 'string' ||
        typeof arg === 'number' ||
        typeof arg === 'boolean'
      ) {
        message += arg + ',\n';
      } else {
        message += JSON.stringify(arg, undefined, 4) + ',\n';
      }
    }

    return message.replace(/,\n$/, '');
  }

  debug(...args: any[]) {
    if (this.logLevel === 'debug') {
      this.log('debug', this.argsToString(args));
    }
  }

  info(...args: any[]) {
    if (['debug', 'info'].includes(this.logLevel)) {
      this.log('info', this.argsToString(args));
    }
  }

  warn(...args: any[]) {
    if (['debug', 'info', 'warn'].includes(this.logLevel)) {
      this.log('warn', this.argsToString(args));
    }
  }

  error(...args: any[]) {
    this.log('error', this.argsToString(args));
  }
}
