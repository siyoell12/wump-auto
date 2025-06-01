const axios = require('axios');
const fs = require('fs').promises;
const userAgents = require('user-agents');
const readline = require('readline');

const colors = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function banner() {
  console.clear();
  console.log(colors.cyan + colors.bold);
  console.log("\n\n     " + colors.yellow + "██╗    ██╗██╗   ██╗███╗   ███╗██████╗    ");
  console.log("     " + colors.yellow + "██║    ██║██║   ██║████╗ ████║██╔══██╗   ");
  console.log("     " + colors.yellow + "██║ █╗ ██║██║   ██║██╔████╔██║██████╔╝   ");
  console.log("     " + colors.yellow + "██║███╗██║██║   ██║██║╚██╔╝██║██╔═══╝    ");
  console.log("     " + colors.yellow + "╚███╔███╔╝╚██████╔╝██║ ╚═╝ ██║██║        ");
  console.log("      " + colors.yellow + "╚══╝╚══╝  ╚═════╝ ╚═╝     ╚═╝╚═╝        ");
  console.log("\n" + colors.reset);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (q) => new Promise(res => rl.question(q, res));

async function loadUsers() {
  try {
    const data = await fs.readFile('users.json', 'utf8');
    return JSON.parse(data);
  } catch {
    console.log(colors.red + '\n[ERROR] File users.json tidak ditemukan. Hubungi admin untuk mendapatkan akses.\n' + colors.reset);
    process.exit(1);
  }
}

const logger = {
  info: (msg) => console.log(colors.blue + '[INFO] ' + colors.reset + msg),
  error: (msg) => console.error(colors.red + '[ERROR] ' + colors.reset + msg),
  success: (msg) => console.log(colors.yellow + '[SUCCESS] ' + colors.reset + msg),
  step: (msg) => console.log(colors.magenta + '[STEP] ' + colors.reset + msg),
  loading: (msg) => console.log(colors.cyan + '[LOADING] ' + colors.reset + msg),
  wallet: (msg) => console.log(colors.white + '[WALLET] ' + colors.reset + msg),
  agent: (msg) => console.log(colors.white + '[AGENT] ' + colors.reset + msg),
};

async function login() {
  banner();
  const users = await loadUsers();
  console.log(' ╔══════════════════════════════════════════╗');
  console.log(' ║              🔐 LOGIN PANEL              ║');
  console.log(' ╠══════════════════════════════════════════╣');
  const username = await prompt(' ║ Username : ');
  const pin = await prompt(' ║ PIN      : ');
  console.log(' ╚══════════════════════════════════════════╝');
  const user = users.find(u => u.username === username && u.pin === pin);
  if (!user) {
    console.log('\n❌ Login gagal. Username atau PIN salah.\n');
    process.exit(1);
  }
  console.log(`\n✅ Login berhasil sebagai ${username}\n`);
  return true;
}

const getCommonHeaders = (token, userAgent) => ({
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.5',
  'authorization': `Bearer ${token}`,
  'content-type': 'application/json',
  'priority': 'u=1, i',
  'sec-ch-ua': userAgent,
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'sec-gpc': '1',
  'Referer': 'https://wump.xyz/',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
});

const userHeaders = (token, userAgent) => ({
  ...getCommonHeaders(token, userAgent),
  'accept': 'application/vnd.pgrst.object+json',
  'accept-profile': 'public',
  'apikey': 'xxx',
  'x-client-info': 'supabase-ssr/0.5.2'
});

const tasksHeaders = (token, userAgent) => ({
  ...getCommonHeaders(token, userAgent),
  'accept-profile': 'public',
  'apikey': 'xxx'
});

async function getUserInfo(token, userAgent) {
  try {
    const authResponse = await axios.put('https://api.wump.xyz/auth/v1/user', {
      data: { current_task: null },
      code_challenge: null,
      code_challenge_method: null
    }, {
      headers: {
        ...getCommonHeaders(token, userAgent),
        'apikey': 'xxx',
        'x-client-info': 'supabase-ssr/0.5.2',
        'x-supabase-api-version': '2024-01-01'
      }
    });
    const userId = authResponse.data.id;
    logger.info(`User ID: ${userId}`);
    const userResponse = await axios.get(`https://api.wump.xyz/rest/v1/users?id=eq.${userId}`, {
      headers: userHeaders(token, userAgent)
    });
    return Array.isArray(userResponse.data) ? userResponse.data[0] : userResponse.data;
  } catch (error) {
    logger.error(`Failed to fetch user info: ${error.message}`);
    return null;
  }
}

async function getTasks(token, userAgent) {
  try {
    const response = await axios.get('https://api.wump.xyz/rest/v1/tasks?select=*', {
      headers: tasksHeaders(token, userAgent)
    });
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch tasks: ${error.message}`);
    return [];
  }
}

async function completeSocialTask(token, taskId, userAgent) {
  try {
    const res = await axios.post('https://api.wump.xyz/functions/v1/api/tasks/social_follow', {
      taskid: taskId
    }, {
      headers: getCommonHeaders(token, userAgent)
    });
    return res.data;
  } catch (error) {
    logger.error(`Failed to complete social task ${taskId}: ${error.message}`);
    return null;
  }
}

async function completeReferralTask(token, taskId, userAgent) {
  try {
    const res = await axios.post('https://api.wump.xyz/functions/v1/api/tasks/referral', {
      taskid: taskId
    }, {
      headers: getCommonHeaders(token, userAgent)
    });
    return res.data;
  } catch (error) {
    logger.error(`Failed to complete referral task ${taskId}: ${error.message}`);
    return null;
  }
}

async function main() {
  banner();
  await login();
  try {
    const tokensData = await fs.readFile('tokens.txt', 'utf8');
    const tokens = tokensData.split('\n').map(line => line.trim()).filter(Boolean);
    for (const token of tokens) {
      logger.step(`Processing token: ${token.slice(0, 20)}...`);
      const userAgent = new userAgents().toString();
      logger.agent(`Using User-Agent: ${userAgent}`);
      logger.loading('Fetching user information...');
      const userInfo = await getUserInfo(token, userAgent);
      if (userInfo?.username) {
        logger.info(`User: ${userInfo.username}`);
        logger.wallet(`Total Points: ${userInfo.total_points}`);
      } else {
        logger.error('Skipping token due to user info fetch failure');
        continue;
      }
      logger.loading('Fetching tasks...');
      const tasks = await getTasks(token, userAgent);
      for (const task of tasks) {
        logger.step(`Processing task: ${task.task_description || 'No description'} (ID: ${task.id})`);
        if (task.task_type === 'social_follow') {
          const res = await completeSocialTask(token, task.id, userAgent);
          logger.info(`Social task response: ${JSON.stringify(res)}`);
        } else if (task.task_type === 'referral') {
          const res = await completeReferralTask(token, task.id, userAgent);
          logger.info(`Referral task response: ${JSON.stringify(res)}`);
        } else {
          logger.info(`Task type ${task.task_type} not handled.`);
        }
      }
    }
    logger.success('All tokens processed successfully!');
  } catch (error) {
    logger.error(`Unexpected error: ${error.message}`);
  } finally {
    rl.close();
  }
}

main();
