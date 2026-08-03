import bcrypt from "bcryptjs";

const password = process.argv[2];

if (!password) {
  console.error('Uso: npm run hash-password -- "sua senha aqui"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log(hash);
