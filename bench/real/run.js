require('./round10');
const exec = require('child_process').exec;

const argv = {
  d: 13,
  b: 2,
  i: 30,
};

const stringUrl = 'http://localhost:9000/';
const streamUrl = 'http://localhost:9001/';
const genUrl = 'http://localhost:9002/';

async function main() {
  console.log("Warming up the server");
  await Promise.all([stringUrl, streamUrl, genUrl].map(warmUp));

  const stringResults = await getSamples(stringUrl, argv.d, argv.b, argv.i);
  const streamResults = await getSamples(streamUrl, argv.d, argv.b, argv.i);
  const genResults = await getSamples(genUrl, argv.d, argv.b, argv.i);

  console.log(`\n\nResults`);

  console.log("Depth\tStream Size\tStream TTFB\tStream TTLB\tStringSize\tString TTFB\tString TTLB\tGenSize\tGen TTFB\tGen TTLB\tSize Diff\tTTFB Diff\tTTLB Diff");
  for (let depth = 1; depth <= argv.d; depth++) {
    let ttfbDiff = (streamResults[depth].ttfb - stringResults[depth].ttfb) / stringResults[depth].ttfb;
    let ttlbDiff = (streamResults[depth].ttlb - stringResults[depth].ttlb) / stringResults[depth].ttlb;
    let sizeDiff = (streamResults[depth].size - stringResults[depth].size) / stringResults[depth].size;
    console.log(
      `${depth}\t` +
      `${Math.round10(streamResults[depth].size, 0)}\t${Math.round10(streamResults[depth].ttfb *1000, -1)}\t${Math.round10(streamResults[depth].ttlb * 1000, -1)}\t` +
      `${Math.round10(stringResults[depth].size, 0)}\t${Math.round10(stringResults[depth].ttfb *1000, -1)}\t${Math.round10(stringResults[depth].ttlb * 1000, -1)}\t` +
      `${Math.round10(genResults[depth].size, 0)}\t${Math.round10(genResults[depth].ttfb *1000, -1)}\t${Math.round10(genResults[depth].ttlb * 1000, -1)}\t` +
      `${Math.round10(sizeDiff * 100, -1)}%\t${Math.round10(ttfbDiff * 100, -1)}%\t${Math.round10(ttlbDiff * 100, -1)}%`
      );
  }
}


const warmUp = async (url) => {
  for (let i = 0; i < 20; i++) {
    await executeCurl(url, 13, 2);
    await executeCurl(url, 13, 2);
    await executeCurl(url, 13, 2);
  }
}
const average = (input) => {
  if (input.length === 0) return 0;

  let sum = 0;
  input.forEach((i) => {sum += i;});
  return (sum / input.length);
}

const getSamples = async (url, maxDepth, breadth, iterations) => {
  var results = {};
  for (let depth = 1; depth <= maxDepth; depth++) {
    console.log(`Testing ${url} depth ${depth}`);
    let ttfbs = [], ttlbs = [], sizes = [];
    for (let i = 0; i < iterations; i++) {
      let {ttfb, ttlb, size} = await executeCurl(url, depth, breadth);
      ttfbs.push(ttfb);
      ttlbs.push(ttlb);
      sizes.push(size);
    }
    results[depth] = {ttfb: average(ttfbs), ttlb: average(ttlbs), size: average(sizes)};
  }
  await executeCurl(url + 'quit', 0, 0);
  return results;
}

const executeCurl = (url, depth, breadth) => {
  return new Promise((resolve, reject) => {
    exec(`curl -s -w "%{time_pretransfer} %{time_starttransfer} %{time_total} %{size_download}" --max-time 300 -o /dev/null "${url}?depth=${depth}&breadth=${breadth}"`, function (error, stdout, stderr) {
      if (error !== null) {
        console.log(error);
        reject(error);
      }
      const output = stdout.toString();
      const statsLine = output;
      const [preTransfer, startTransfer, total, sizeDownload] = statsLine.split(" ");
      resolve({
        ttfb: (startTransfer - preTransfer), 
        ttlb: (total - preTransfer),
        size: parseInt(sizeDownload)
      });
    });
  });
};

// Wait for servers to launch
setTimeout(main, 3000);
