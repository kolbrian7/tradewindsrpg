"""Build seamless background loops for Merchants of the Mediterranean from the Sonniss library on the desktop.

recipes.json: {scene: {"len": seconds, "layers": [{"file": path, "start": s, "gain_db": g}, ...]}}
Each layer is cut (start .. start+len+XF), the layers are mixed, loudness-matched, and the end is
crossfaded into the beginning so the loop has no seam. Writes out/<scene>.mp3 (stereo, 96 kb/s) and
out/<scene>_preview.mp3 (the loop played twice, to listen for the seam).
"""
import json, os, subprocess, sys

ROOT = 'D:/Sound Library/Sonniss GDC/'
XF = 3.0          # seconds of crossfade at the loop point
OUT = 'out'
os.makedirs(OUT, exist_ok=True)
recipes = json.load(open(sys.argv[1], encoding='utf-8'))


def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-1500:])
        raise SystemExit(f'ffmpeg failed for {args[-1]}')


for scene, rec in recipes.items():
    L = float(rec['len'])
    span = L + XF
    args = ['ffmpeg', '-y', '-v', 'error']
    for lay in rec['layers']:
        args += (['-stream_loop', '-1'] if lay.get('loop') else []) + ['-ss', str(lay.get('start', 0)), '-t', str(span), '-i', ROOT + lay['file']]
    n = len(rec['layers'])
    f = []
    for i, lay in enumerate(rec['layers']):
        f.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume={lay.get('gain_db', 0)}dB[l{i}]")
    mix = ''.join(f'[l{i}]' for i in range(n))
    f.append(f"{mix}amix=inputs={n}:normalize=0,loudnorm=I=-24:TP=-3:LRA=11,aresample=44100,asplit=3[m1][m2][m3]")
    f.append(f"[m1]atrim={XF}:{L},asetpts=PTS-STARTPTS[body]")
    f.append(f"[m2]atrim={L}:{span},asetpts=PTS-STARTPTS[tail]")
    f.append(f"[m3]atrim=0:{XF},asetpts=PTS-STARTPTS[head]")
    f.append(f"[tail][head]acrossfade=d={XF}:c1=qsin:c2=qsin[seam]")
    f.append(f"[body][seam]concat=n=2:v=0:a=1[out]")
    wav = f'{OUT}/{scene}.wav'
    run(args + ['-filter_complex', ';'.join(f), '-map', '[out]', wav])
    # The game loops from 0.06 s to (end - 0.06 s) to skip MP3 padding. Wrap 0.06 s of the loop's own end onto
    # its start and its own start onto its end, so exactly the loop lies between those two points.
    P = 0.06
    Lr = L  # length of the loop wav
    wrapped = f'{OUT}/{scene}_w.wav'
    run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-filter_complex',
         f"[0:a]asplit=3[x][y][z];[x]atrim={Lr - P}:{Lr},asetpts=PTS-STARTPTS[pre];[z]atrim=0:{P},asetpts=PTS-STARTPTS[post];"
         f"[pre][y][post]concat=n=3:v=0:a=1[o]", '-map', '[o]', wrapped])
    run(['ffmpeg', '-y', '-v', 'error', '-i', wrapped, '-c:a', 'libmp3lame', '-b:a', '96k', f'{OUT}/{scene}.mp3'])
    os.remove(wrapped)
    run(['ffmpeg', '-y', '-v', 'error', '-stream_loop', '1', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '128k', f'{OUT}/{scene}_preview.mp3'])
    run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-lavfi', 'showspectrumpic=s=1200x300:legend=0:scale=log:fscale=log', f'{OUT}/{scene}_spec.png'])
    os.remove(wav)
    print(scene, 'ok', round(os.path.getsize(f'{OUT}/{scene}.mp3') / 1e3), 'KB', flush=True)
