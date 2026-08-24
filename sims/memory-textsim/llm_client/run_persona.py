"""
Run a persona through the text simulation using an OpenAI-compatible endpoint
(such as MicroDC.ai). Writes a schema-compliant PlayerProfile JSON to disk.

Usage:
    python run_persona.py --persona withdrawer --model qwen3:32b --output-dir traces/

Requires:
    pip install openai
    The Node engine_bridge running on localhost:3001 (start with `node engine_bridge.js`)
"""
import argparse
import json
import os
import sys
import time
import uuid
from pathlib import Path
import urllib.request
import urllib.error

try:
    from openai import OpenAI
except ImportError:
    print("Install openai first: pip install openai")
    sys.exit(1)


def call_engine(action, payload=None):
    """Call the local Node engine bridge."""
    url = f"http://localhost:3001/{action}"
    data = json.dumps(payload or {}).encode('utf-8')
    req = urllib.request.Request(
        url, data=data,
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.URLError as e:
        print(f"Engine bridge error: {e}. Is `node engine_bridge.js` running?")
        sys.exit(1)


def format_scene_prompt(scene):
    """Turn a scene object into a prompt the LLM can respond to."""
    lines = []
    if scene.get('narration'):
        lines.append('\n'.join(scene['narration']))
    if scene.get('choices'):
        lines.append('\nAvailable choices:')
        for choice in scene['choices']:
            lines.append(f"- option_id: {choice['option_id']}")
            lines.append(f"  text: {choice['text']}")
    lines.append('\nRespond with only the option_id of your choice.')
    return '\n'.join(lines)


def run_playthrough(persona_key, persona_config, model, client, memory_id='memory_1'):
    """Run one full playthrough for a given persona and model."""
    profile_id = str(uuid.uuid4())

    # Initialize engine session
    session = call_engine('start', {
        'memory_id': memory_id,
        'profile_id': profile_id,
        'metadata': {
            'generation_source': 'llm',
            'llm_model': model,
            'llm_persona_intent': persona_config['name'],
            'llm_temperature': 0.7,
            'llm_prompt_version': 'v1.0'
        }
    })

    max_turns = 50  # safety cap
    turn = 0

    while not session['finished'] and turn < max_turns:
        scene = session['current_scene']
        if not scene.get('choices'):
            # Terminal or no-choice scene, advance
            session = call_engine('advance', {'profile_id': profile_id})
            turn += 1
            continue

        prompt = format_scene_prompt(scene)
        response = client.chat.completions.create(
            model=model,
            messages=[
                {'role': 'system', 'content': persona_config['system_prompt']},
                {'role': 'user', 'content': prompt}
            ],
            temperature=0.7,
            max_tokens=50
        )

        raw_choice = response.choices[0].message.content.strip()
        # Extract just the option_id from possibly noisy output
        choice_id = None
        valid_ids = [c['option_id'] for c in scene['choices']]
        for vid in valid_ids:
            if vid in raw_choice:
                choice_id = vid
                break

        if choice_id is None:
            # Fallback: pick the first valid choice deterministically
            choice_id = valid_ids[0]
            print(f"  ! Could not parse choice from '{raw_choice}', defaulting to {choice_id}")

        session = call_engine('choose', {
            'profile_id': profile_id,
            'option_id': choice_id
        })
        turn += 1

    # Get the completed trace
    trace = call_engine('export', {'profile_id': profile_id})
    return trace


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--persona', required=True, help='Persona key (e.g. withdrawer)')
    parser.add_argument('--model', required=True, help='Model name (e.g. qwen3:32b)')
    parser.add_argument('--count', type=int, default=1, help='Number of playthroughs')
    parser.add_argument('--output-dir', default='traces', help='Where to save JSON traces')
    parser.add_argument('--api-base', default=os.environ.get('MICRODC_API_BASE', 'https://api.microdc.ai/v1'))
    parser.add_argument('--api-key', default=os.environ.get('MICRODC_API_KEY'))
    args = parser.parse_args()

    if not args.api_key:
        print("Set MICRODC_API_KEY env var or pass --api-key")
        sys.exit(1)

    personas = json.loads(Path(__file__).parent.joinpath('personas.json').read_text())
    if args.persona not in personas['personas']:
        print(f"Unknown persona: {args.persona}")
        print(f"Available: {list(personas['personas'].keys())}")
        sys.exit(1)

    persona_config = personas['personas'][args.persona]
    client = OpenAI(base_url=args.api_base, api_key=args.api_key)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    for i in range(args.count):
        print(f"Playthrough {i+1}/{args.count} — {args.persona} on {args.model}")
        start = time.time()
        try:
            trace = run_playthrough(args.persona, persona_config, args.model, client)
            elapsed = time.time() - start
            filename = f"{args.persona}_{args.model.replace(':', '_').replace('/', '_')}_{trace['profile_id'][:8]}.json"
            output_path = output_dir / filename
            output_path.write_text(json.dumps(trace, indent=2))
            print(f"  ✓ {elapsed:.1f}s → {filename}")
        except Exception as e:
            print(f"  ✗ Failed: {e}")


if __name__ == '__main__':
    main()
