const React = require("react");

const leaf = React.createElement('div', null, 'abcdefghij');

class RecursiveDivs extends React.Component {
  render() {
    const {depth, breadth, textLength} = this.props;

    if (depth <= 0) {
      return leaf;
    }

    let children = [];
    for (let i = 0; i < breadth; i++) {
      children.push(React.createElement(RecursiveDivs, {
        key: i,
        depth: depth - 1,
        breadth,
        textLength
      }));
    }
    return React.createElement('div', null, children);
  }
}

module.exports = RecursiveDivs;
