import { Language, LanguageConfig } from "../types";

const LANGUAGE_CONFIGS: Record<Language, LanguageConfig> = {
  py: {
    extension: "py",
    fileName: "main.py",
    runCommand: "/usr/bin/python3 main.py",
    opts: "",
  },
  js: {
    extension: "js",
    fileName: "main.js",
    runCommand: "/usr/local/bin/node main.js",
    opts: "",
  },
  java: {
    extension: "java",
    fileName: "main.java",
    compileCommand: "/usr/bin/javac main.java",
    runCommand: "/usr/bin/java main",
    opts: "--dir=/etc/alternatives=/etc/alternatives --dir=/etc/java-17-openjdk=/etc/java-17-openjdk",
  },
  cpp: {
    extension: "cpp",
    fileName: "main.cpp",
    compileCommand: "/usr/bin/g++ -o program main.cpp",
    runCommand: "./program",
    opts: "",
  },
  rs: {
    extension: "rs",
    fileName: "main.rs",
    compileCommand: "/usr/local/bin/rustc -o program main.rs",
    runCommand: "./program",
    opts: "-E HOME=/tmp --dir=/etc/alternatives=/etc/alternatives",
  },
  go: {
    extension: "go",
    fileName: "main.go",
    compileCommand: "/usr/local/go/bin/go build -o program main.go",
    runCommand: "./program",
    opts: "--dir=/usr/local/go=/usr/local/go -E GOCACHE=/tmp -E GOPATH=/tmp/go -E HOME=/tmp --open-files=256 -p120",
  },
  c: {
    extension: "c",
    fileName: "main.c",
    compileCommand: "/usr/bin/gcc -o program main.c -lm",
    runCommand: "./program",
    opts: "",
  },
  ts: {
    extension: "ts",
    fileName: "main.ts",
    runCommand: "/usr/local/bin/node --experimental-strip-types main.ts",
    opts: "",
  },
  rb: {
    extension: "rb",
    fileName: "main.rb",
    runCommand: "/usr/bin/ruby main.rb",
    opts: "",
  },
  php: {
    extension: "php",
    fileName: "main.php",
    runCommand: "/usr/bin/php8.2 main.php",
    opts: "",
  },
};

export default LANGUAGE_CONFIGS;
