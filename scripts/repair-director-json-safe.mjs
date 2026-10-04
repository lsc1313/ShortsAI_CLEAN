import fs from "node:fs";

const file = "./longform/director.js";
let src = fs.readFileSync(file, "utf8");

const start = src.indexOf('function parseJSON(text = "") {');
const next = src.indexOf("function charCount", start);

if (start < 0 || next < 0) {
    throw new Error("parseJSON RANGE NOT FOUND");
}

const eol = src.includes("\r\n") ? "\r\n" : "\n";

const replacement = [
'function parseJSON(text = "") {',
'    const cleaned = cleanText(text);',
'',
'    try {',
'        return JSON.parse(cleaned);',
'    } catch {}',
'',
'    let start = -1;',
'',
'    for (let i = 0; i < cleaned.length; i++) {',
'        if (cleaned[i] === "{" || cleaned[i] === "[") {',
'            start = i;',
'            break;',
'        }',
'    }',
'',
'    if (start < 0) {',
'        throw new Error("AI JSON start not found");',
'    }',
'',
'    const stack = [];',
'    let inString = false;',
'    let escaped = false;',
'',
'    for (let i = start; i < cleaned.length; i++) {',
'        const ch = cleaned[i];',
'',
'        if (inString) {',
'            if (escaped) {',
'                escaped = false;',
'                continue;',
'            }',
'',
'            if (ch === "\\\\") {',
'                escaped = true;',
'                continue;',
'            }',
'',
'            if (ch === \'"\') {',
'                inString = false;',
'            }',
'',
'            continue;',
'        }',
'',
'        if (ch === \'"\') {',
'            inString = true;',
'            continue;',
'        }',
'',
'        if (ch === "{") {',
'            stack.push("}");',
'            continue;',
'        }',
'',
'        if (ch === "[") {',
'            stack.push("]");',
'            continue;',
'        }',
'',
'        if (ch === "}" || ch === "]") {',
'            const expected = stack.pop();',
'',
'            if (expected !== ch) {',
'                throw new Error("AI JSON bracket mismatch");',
'            }',
'',
'            if (stack.length === 0) {',
'                return JSON.parse(cleaned.slice(start, i + 1));',
'            }',
'        }',
'    }',
'',
'    throw new Error("AI JSON incomplete");',
'}',
''
].join(eol);

src =
    src.slice(0, start) +
    replacement +
    eol +
    src.slice(next);

fs.writeFileSync(file, src, "utf8");

console.log("DIRECTOR RESTORED + JSON PARSER PATCHED");
