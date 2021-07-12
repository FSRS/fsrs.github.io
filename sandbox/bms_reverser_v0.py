# -*- coding: utf-8 -*-
"""
Created on Mon Jul 12 19:51:00 2021

@author: arctiidae5fury
"""
from math import gcd

###Define BMS' path and operation sections##
path="Air\\god.bme" #Enter the full path of a BMS file"
path2="Air\\dog.bme" #reverse BMS output
meslen=109 #predict, should be larger than actual # of the measure

f = open(path, 'rt', encoding='shift_jisx0213') 
lines = f.readlines()
f.close()

g = open(path2,'w+', encoding='shift_jisx0213')
g.truncate(0)
obj_dict={} #key:"05417", value:"00110000"
bgm_list=[] #nested list, bgm_list[# of measure]=["01","03"]

maxmes=0
def reform(text, obj, idx, hlen):
    olen=round(len(text)/2) #원래 비트수
    rlen=round(olen*hlen/gcd(olen,hlen))
    rtext="00"*rlen
    for oidx in range(olen):
        oobj=text[2*oidx:2*(oidx+1)]
        if oobj!="00": 
            ridx=round(oidx*(rlen/olen))
            rtext=rtext[0:2*ridx]+oobj+rtext[2*(ridx+1):2*rlen]
    if obj!="00":
        ridx=round(idx*(rlen/hlen))
        if rtext[2*ridx:2*(ridx+1)]!="00": raise ValueError
        else: rtext=rtext[0:2*ridx]+obj+rtext[2*(ridx+1):2*rlen]
    return rtext
    
for i in range(meslen+1): bgm_list.append([])
for line in lines:
    if line[1:6].isnumeric():
        #if int(line[1:4])==10:
        (ms_no, colon, ms_len)=line.partition(':')
        if int(ms_no[1:4])>maxmes: maxmes=int(ms_no[1:4])
        (objs, _n, after)=ms_len.partition('\n')
        l_obj=int(len(objs)/2) #마디의 길이 (32비트로 나뉘어있으면 32)
        for l_idx in range(l_obj):
            obj=objs[2*l_idx:2*(l_idx+1)]
            lane=ms_no[4:6]
            if obj!="00":
                newidx=(l_obj-l_idx)%l_obj #마디 내 위치: 17/32에서 17
                if l_idx==0:
                    newmes=meslen-int(ms_no[1:4])
                    newidx=0
                    l_obj2=1
                else: 
                    newmes=meslen-int(ms_no[1:4])-1
                    newidx=l_obj-l_idx
                    l_obj2=l_obj
                key="0"*(3-len(str(newmes)))+str(newmes)+lane
                txt="00"*(newidx)+obj+"00"*(l_obj2-1-newidx)
                if lane!="01":
                    try:
                        if obj_dict[key]==None: obj_dict[key]=txt
                        else: obj_dict[key]=reform(obj_dict[key], obj, newidx, l_obj2) #ZY, 17, 32
                    except KeyError: obj_dict[key]=txt
                else:
                    Flag=False
                    for bidx in range(len(bgm_list[newmes])):
                        try: 
                            bgm_list[newmes][bidx]=reform(bgm_list[newmes][bidx], obj, newidx, l_obj2)
                            Flag=True
                        except ValueError: pass
                        if Flag: break
                    if Flag==False: bgm_list[newmes].append(txt)
    else: 
        if line!="\n": g.write(line)
for k in obj_dict: 
    v=obj_dict[k]
    mmes=int(k[0:3])+maxmes-meslen+1 #modified 마디 번
    k="0"*(3-len(str(mmes)))+str(mmes)+k[3:5]
    line="#"+k+":"+v+'\n'; g.write(line)
for midx in range(len(bgm_list)): #midx는 마디번호
    bMlist=bgm_list[midx]
    mmidx=midx+maxmes-meslen+1
    k="0"*(3-len(str(mmidx)))+str(mmidx)
    for v in bMlist: line="#"+k+"01:"+v+'\n'; g.write(line)   
g.close()
        
            