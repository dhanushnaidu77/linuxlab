import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const readMap = (file) => new Map(Object.entries(YAML.parse(fs.readFileSync(file, 'utf8')) || {}).map(([id, v]) => [id, { id, ...v }]));

export function loadDefs(dir) {
  return {
    personas: readMap(path.join(dir, 'personas.yaml')),
    channels: readMap(path.join(dir, 'channels.yaml')),
    skills: readMap(path.join(dir, 'skills.yaml')),
  };
}
