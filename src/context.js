class RenderContext {
  constructor() {
    this.buffer = [];
    this.nextWriteHeader = null;
    this.position = 0;
  }

  enqueueNextWriteHeader(header) {
    this.nextWriteHeader = header;
  }

  resetNextWriteHeader() {
    this.nextWriteHeader = null;
  }

  write(chunk) {
    if (this.nextWriteHeader) {
      this.buffer.push(this.nextWriteHeader);
      this.position += this.nextWriteHeader.length;
      this.resetNextWriteHeader();
    }
    this.buffer.push(chunk);
    this.position += chunk.length;
  }

  flush() {
    return this.buffer.join('');
  }
}

module.exports = RenderContext;
