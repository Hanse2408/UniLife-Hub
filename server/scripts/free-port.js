const { execSync } = require("child_process");

const port = Number(process.env.PORT || process.argv[2] || 5000);

function run(command) {
    try {
        return execSync(command, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        });
    } catch (error) {
        return error.stdout?.toString() || "";
    }
}

function getPidsUsingPort(targetPort) {
    if (process.platform === "win32") {
        const output = run(`netstat -ano -p tcp | findstr :${targetPort}`);

        return [...new Set(
            output
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line && /\bLISTENING\b/.test(line))
                .map((line) => line.split(/\s+/).at(-1))
                .filter((pid) => /^\d+$/.test(pid))
        )];
    }

    const output = run(`lsof -ti tcp:${targetPort}`);

    return [...new Set(
        output
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((pid) => /^\d+$/.test(pid))
    )];
}

const pids = getPidsUsingPort(port).filter((pid) => Number(pid) !== process.pid);

if (!pids.length) {
    console.log(`Port ${port} is already free.`);
    process.exit(0);
}

for (const pid of pids) {
    try {
        if (process.platform === "win32") {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
        } else {
            execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        }

        console.log(`Stopped process ${pid} using port ${port}.`);
    } catch (error) {
        console.error(`Failed to stop process ${pid} using port ${port}.`);
        process.exit(1);
    }
}