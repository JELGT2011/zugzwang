export interface EngineCommand {
  cmd: string;
  cb?: (message: string) => void;
  stream?: (message: string) => void;
  discard?: boolean;
  message?: string;
}

export class StockfishEngine {
  private worker: Worker | null = null;
  private que: EngineCommand[] = [];
  private evalRegex = /Total Evaluation[\s\S]+\n$/;
  public loaded = false;
  public ready = false;
  public hasError = false;

  constructor(path: string = "/stockfish.js") {
    if (typeof window !== "undefined") {
      try {
        this.worker = new Worker(path);
        this.worker.onmessage = (e) => this.handleMessage(e);
        this.worker.onerror = (e) => {
          console.error("Stockfish worker error:", e.message);
          console.error("Cross-origin isolated:", window.crossOriginIsolated);
          this.hasError = true;
          // Don't propagate the error to crash the app
          e.preventDefault();
        };
      } catch (error) {
        console.error("Failed to create Stockfish worker:", error);
        console.error("Cross-origin isolated:", window.crossOriginIsolated);
        this.hasError = true;
      }
    }
  }

  private getFirstWord(line: string): string {
    const spaceIndex = line.indexOf(" ");
    if (spaceIndex === -1) {
      return line;
    }
    return line.substring(0, spaceIndex);
  }

  private determineQueNum(line: string): number {
    if (this.que.length === 0) return 0;

    const firstWord = this.getFirstWord(line);
    let cmdType: string;

    if (this.que[0].cmd === "bench" || this.que[0].cmd === "perft") {
      return 0;
    }

    if (firstWord === "uciok" || firstWord === "option") {
      cmdType = "uci";
    } else if (firstWord === "readyok") {
      cmdType = "isready";
    } else if (firstWord === "bestmove" || firstWord === "info") {
      cmdType = "go";
    } else {
      cmdType = "other";
    }

    for (let i = 0; i < this.que.length; i++) {
      const cmdFirstWord = this.getFirstWord(this.que[i].cmd);
      if (
        cmdFirstWord === cmdType ||
        (cmdType === "other" && (cmdFirstWord === "d" || cmdFirstWord === "eval"))
      ) {
        return i;
      }
    }

    return 0;
  }

  private handleMessage(e: MessageEvent | string) {
    const line = typeof e === "string" ? e : (e.data as string);
    let done = false;

    if (line.indexOf("\n") > -1) {
      const split = line.split("\n");
      for (let i = 0; i < split.length; i++) {
        this.handleMessage(split[i]);
      }
      return;
    }

    console.debug("Stockfish (onmessage): " + line);

    // Ignore invalid setoption commands since valid ones do not respond.
    // Ignore the beginning output too.
    if (
      !this.que.length ||
      line.startsWith("No such option") ||
      line.startsWith("id ") ||
      line.startsWith("Stockfish")
    ) {
      return;
    }

    const queNum = this.determineQueNum(line);
    const myQue = this.que[queNum];

    if (!myQue) return;

    if (myQue.stream) {
      myQue.stream(line);
    }

    myQue.message = (myQue.message || "") + (myQue.message ? "\n" : "") + line;

    // Try to determine if the stream is done.
    if (line === "uciok") {
      done = true;
      this.loaded = true;
    } else if (line === "readyok") {
      done = true;
      this.ready = true;
    } else if (line.startsWith("bestmove") && myQue.cmd !== "bench") {
      done = true;
      // All "go" needs is the last line (use stream to get more)
      myQue.message = line;
    } else if (myQue.cmd === "d") {
      if (line.startsWith("Legal uci moves") || line.startsWith("Key is")) {
        done = true;
        // If this is the hack, delete it.
        if (line === "Key is") {
          myQue.message = myQue.message.slice(0, -7);
        }
      }
    } else if (myQue.cmd === "eval") {
      if (this.evalRegex.test(myQue.message)) {
        done = true;
      }
    } else if (line.startsWith("pawn key")) {
      done = true;
    } else if (line.startsWith("Nodes/second")) {
      done = true;
    } else if (line.startsWith("Unknown command")) {
      done = true;
    }

    if (done) {
      this.que.splice(queNum, 1);
      if (myQue.cb && !myQue.discard) {
        myQue.cb(myQue.message);
      }
    }
  }

  public send(cmd: string, cb?: (message: string) => void, stream?: (message: string) => void) {
    // Don't send commands if the worker has errored
    if (this.hasError || !this.worker) {
      console.warn("Stockfish: Cannot send command, worker is not available");
      if (cb) {
        setTimeout(() => cb(""), 0);
      }
      return;
    }

    cmd = cmd.trim();

    console.debug("Stockfish (send): " + cmd);

    const firstWord = this.getFirstWord(cmd);
    const noReplyCmds = ["ucinewgame", "flip", "stop", "ponderhit", "position", "setoption"];

    if (!noReplyCmds.includes(firstWord)) {
      this.que.push({
        cmd,
        cb,
        stream,
      });
    } else {
      if (cb) {
        setTimeout(cb, 0);
      }
    }

    this.worker.postMessage(cmd);
  }

  public stopMoves() {
    for (let i = 0; i < this.que.length; i++) {
      if (this.getFirstWord(this.que[i].cmd) === "go" && !this.que[i].discard) {
        this.send("stop");
        this.que[i].discard = true;
      }
    }
  }

  public getQueueLen() {
    return this.que.length;
  }

  public quit() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.ready = false;
    }
  }
}
