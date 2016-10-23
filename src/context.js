class RenderContext {
  constructor() {
    this.buffer = [];
    this.incompleteOpenTag = false;
    this.newlineEatingTag = false;
    this.position = 0;
  }

  writeIncompleteOpenTag(markup, newlineEatingTag) {
    this.write(markup);
    this.incompleteOpenTag = true;
    this.newlineEatingTag = newlineEatingTag;
    return {
      position: this.position,
    };
  }

  completeTag(tagName, omitCloseTag, {position}) {
    var isEmpty = this.position === position;
    if (isEmpty && omitCloseTag) {
      this.incompleteOpenTag = false;
      this.newlineEatingTag = false;
      this.write('/>');
    } else {
      this.write('</' + tagName + '>');
    }
  }

  write(chunk) {
    if (this.incompleteOpenTag) {
      this._write('>');
      if (this.newlineEatingTag && chunk.charAt(0) === '\n') {
        // text/html ignores the first character in these tags if it's a newline
        // Prefer to break application/xml over text/html (for now) by adding
        // a newline specifically to get eaten by the parser. (Alternately for
        // textareas, replacing "^\n" with "\r\n" doesn't get eaten, and the first
        // \r is normalized out by HTMLTextAreaElement#value.)
        // See: <http://www.w3.org/TR/html-polyglot/#newlines-in-textarea-and-pre>
        // See: <http://www.w3.org/TR/html5/syntax.html#element-restrictions>
        // See: <http://www.w3.org/TR/html5/syntax.html#newlines>
        // See: Parsing of "textarea" "listing" and "pre" elements
        //  from <http://www.w3.org/TR/html5/syntax.html#parsing-main-inbody>
        this._write('\n');
      }
      this.incompleteOpenTag = false;
      this.newlineEatingTag = false;
    }
    this._write(chunk);
  }
  
  _write(chunk) {
    this.buffer.push(chunk);
    this.position += chunk.length;
  }

  flush() {
    return this.buffer.join('');
  }
}

module.exports = RenderContext;
