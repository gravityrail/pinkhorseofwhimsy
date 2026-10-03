"""Original IndigoKart audio: rendered layered engines, Foley and three arrangements.
Requires Python + NumPy and ffmpeg. No recordings or licensed sample packs used.
Run from anywhere: python3 art/build_audio.py
"""
from pathlib import Path
import numpy as np, wave, subprocess, tempfile, math
OUT=Path(__file__).resolve().parents[1]/'public'/'audio'; OUT.mkdir(exist_ok=True)
SR=32000; rng=np.random.default_rng(731)

def noise(n, width=1):
    x=rng.normal(0,1,n)
    return np.convolve(x,np.ones(width)/width,'same') if width>1 else x

def save(name,x,volume=.8):
    if x.ndim==1:x=np.column_stack([x,x])
    x=np.tanh(x); x=x/max(.001,np.max(np.abs(x)))*volume
    with tempfile.NamedTemporaryFile(suffix='.wav') as f:
        with wave.open(f.name,'wb') as w:
            w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype('<i2').tobytes())
        subprocess.run(['ffmpeg','-v','error','-y','-i',f.name,'-c:a','libmp3lame','-b:a','128k',str(OUT/(name+'.mp3'))],check=True)

def exhaust(profile,load):
    n=SR*4;t=np.arange(n)/SR
    # Individual uneven cylinder combustion events excite several exhaust/body modes.
    rate=42 if profile=='truck' else 31; impulses=np.zeros(n)
    for i in range(int(rate*4)):
        k=int((i/rate+rng.uniform(-.001,.001))*SR)%n
        impulses[k]=rng.uniform(.7,1.2)*(1+.14*math.sin(i*.8))
    tt=np.arange(int(SR*.18))/SR
    pulse=sum(np.sin(2*np.pi*f*tt)*np.exp(-tt*d)*a for f,d,a in [(67,29,1),(113,40,.45),(213,66,.35),(347,95,.15)])
    pulse+=noise(len(tt),4)*np.exp(-tt*100)*.35
    x=np.fft.irfft(np.fft.rfft(impulses)*np.fft.rfft(pulse,n))
    x+=noise(n,32)*(.28 if load else .12)
    x=np.tanh(x*(1.9 if load else .9))*.7
    x+=noise(n,8)*.045
    if profile=='tank':x+=noise(n,55)*.5+np.sin(t*2*np.pi*36)*.13
    return x
for p in ['truck','tank']:
    for load in [0,1]:save(f'{p}-{["idle","load"][load]}',exhaust(p,load))
# Electric cars get mostly textured gearbox, road and intake noise, with restrained
# harmonic motor detail buried below it rather than a piercing sine whistle.
n=SR*4;t=np.arange(n)/SR
motor=noise(n,18)*.7+noise(n,70)*1.2
motor+=sum(np.sin(2*np.pi*f*t+np.sin(t*2*np.pi*3)*.18)*a for f,a in [(83,.14),(166,.05),(249,.018)])
save('electric-load',motor);save('electric-idle',noise(n,100)*.14)
for name,width in [('road',9),('gravel',3),('rain',2),('wind',60)]:
    x=noise(n,width); mod=1+np.sin(t*2*np.pi*.5)*.12+np.sin(t*2*np.pi*2)*.07
    save(name,x*mod,.6)
x=noise(n,3)*.34
# Irregular rubber friction resonances, amplitude-modulated by contact chatter.
for f in [620,843,1197]:x+=np.sin(2*np.pi*f*t+np.sin(t*37)*.7)*.12
save('tires',x*(.7+.3*np.sin(t*17)**2),.65)
for variant in range(3):
    t=np.arange(int(SR*1.7))/SR
    x=noise(len(t),7)*np.exp(-t*13)*1.6
    x+=np.sin(2*np.pi*(58*t+35*.025*(1-np.exp(-t/.025))))*np.exp(-t*10)*1.1
    for f in [173,287,451,793,1321]: x+=np.sin(2*np.pi*f*(1+variant*.07)*t)*np.exp(-t*(5+f/200))*.18
    for at in [.08,.145,.24,.36]:x+=noise(len(t),2)*np.exp(-np.maximum(0,t-at)*40)*(t>=at)*.24
    save('crash-'+str(variant),x,.92)
save('scrape',noise(n,2)*(.5+.3*np.sin(np.arange(n)*.007)**2),.7)

def note(freq,length,kind):
    t=np.arange(int(length*SR))/SR
    if kind=='bass':
        x=sum(np.sin(2*np.pi*freq*k*t)*np.exp(-t*(2+k))*.5/k for k in range(1,6))
    elif kind=='guitar':
        x=sum(np.sin(2*np.pi*freq*k*t+rng.uniform(-.08,.08))*np.exp(-t*(2.5+k*.9))/k**1.1 for k in range(1,12))
        x+=noise(len(t),3)*np.exp(-t*75)*.12
    else:
        x=sum(np.sin(2*np.pi*freq*(1+d)*t)*.19 for d in [-.002,0,.002])
        x+=np.sin(2*np.pi*freq*2*t)*.05
        x*=np.sin(np.pi*np.minimum(t/.14,1)/2)*np.exp(-t*.65)
    return x*np.minimum(t/.005,1)*np.minimum((length-t)/.04,1)

def compose(name,bpm,root):
    beat=60/bpm;bars=32;duration=bars*4*beat;n=int(duration*SR)
    mix=np.zeros((n,2)); midi=lambda v:440*2**((v-69)/12)
    def add(x,at,gain=1,pan=0,echo=False):
        start=int(at*SR); ids=(np.arange(len(x))+start)%n
        mix[ids,0]+=x*gain*math.sqrt((1-pan)/2);mix[ids,1]+=x*gain*math.sqrt((1+pan)/2)
        if echo:
            ids=(ids+int(beat*.75*SR))%n
            mix[ids,0]+=x*gain*.16*math.sqrt((1+pan)/2);mix[ids,1]+=x*gain*.16*math.sqrt((1-pan)/2)
    tt=np.arange(int(SR*.7))/SR
    kick=np.sin(2*np.pi*(47*tt+55*.035*(1-np.exp(-tt/.035))))*np.exp(-tt*11)
    kick+=noise(len(tt),2)*np.exp(-tt*200)*.12
    snare=noise(len(tt),2)*np.exp(-tt*20)*.55+np.sin(2*np.pi*185*tt)*np.exp(-tt*28)*.28
    hat=noise(len(tt));hat=(hat-np.convolve(hat,np.ones(9)/9,'same'))*np.exp(-tt*80)*.16
    progression=[0,5,9,7] if name=='coast' else [0,8,3,10]
    melody=[0,4,7,9,7,4,2,0,4,7,12,11,9,7,4,2] if name=='coast' else [0,3,7,10,7,3,5,7,12,10,7,5,3,0,3,7]
    for bar in range(bars):
        chord=progression[(bar//2)%4]; breakdown=16<=bar<20
        major=name=='coast';third=4 if major else 3
        for step in range(8):
            at=(bar*4+step*.5)*beat
            if not breakdown:
                if step in ([0,3,4,6] if name=='rally' else [0,2,4,6]):add(kick,at,.64)
                if step in [2,6]:add(snare,at,.48, -.1)
                add(hat,at+(.014 if step%2 else 0),rng.uniform(.45,.7), .4 if step%2 else -.35)
                if bar%8==7 and step>=6:add(snare,at+beat*.25,.2,.25)
            bass=root-24+chord+(12 if step in [3,7] else 0)
            add(note(midi(bass),beat*.48,'bass'),at,.4)
        # Strummed offbeat guitar triads and sustained stereo pads with section changes.
        for tone_index,tone in enumerate([0,third,7]):
            add(note(midi(root+chord+tone),beat*7.8,'pad'),bar*4*beat,.065,(-.6,0,.6)[tone_index])
            for off in [0,1.5,2.5,3.5]:
                add(note(midi(root+chord+tone),beat*.9,'guitar'),(bar*4+off)*beat+tone_index*.012,.09,-.45,True)
        if bar>=4 and not breakdown:
            for k in range(4):
                m=root+12+melody[(bar*4+k)%16]+(12 if 24<=bar<28 and k%2 else 0)
                add(note(midi(m),beat*.8,'guitar'),(bar*4+k+(.5 if k%2 else 0))*beat,.16,.3,True)
    # Soft master saturation and moderate headroom. Fold tails into the start so
    # 32-bar arrangements loop seamlessly rather than restarting a short jingle.
    save('music-'+name,mix*.9,.78)
for args in [('coast',116,62),('harbor',126,57),('rally',132,52)]:compose(*args)
print('Rendered original engine layers, collision Foley and 32-bar soundtracks.')
