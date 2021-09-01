# -*- coding: utf-8 -*-
"""
Created on Sun Aug 29 16:51:34 2021

@author: arctiidae5fury
version: 1.2
"""
import win32clipboard
import random
#yksan to insane chart generator
#copy ibmsc data on 2P region, run the script, then paste the clipboard on ibmsc

#setting#
quant_u=12 #unit of quantization (1 = 1/192 measure, 12 = 1/16 measure)  
keys=7
reset_memo=False #if there is a 0 note quantized unit: reset keymemo
lane1, lane2= 5, 13
keymemo=[] #inverse of desired first note 
##(if you want 1 3 5 7 chord at first, set this as [1,3,5] [2,4,6]-1)



#Read clipboard
win32clipboard.OpenClipboard()
cldata = win32clipboard.GetClipboardData()
win32clipboard.CloseClipboard()
clsp=cldata.split("\r\n")
newcl=clsp[0]+'\r\n'

#def func
def Sort(sub_li):
    return(sorted(sub_li, key = lambda x: x[1]))   
#parse clipboard
p1lis=[]; p2lis=[]; etclis=[]
for line in clsp[1:]:
    ls=line.split(" ")
    lisp=[int(ls[0]), float(ls[1])]
    for l in ls[2:6]: lisp.append(int(l))
    if lane1<=lisp[0] and lisp[0]<lane1+keys: p1lis.append(lisp) #scratch is not interest
    elif lane2<=lisp[0] and lisp[0]<=lane2+keys: p2lis.append(lisp)
    else: etclis.append(lisp)
    
#fixed setting 
mtp=0; i1=0; i2=0; p1len=len(p1lis); p2len=len(p2lis) 
pack0, pack1=list(range(keys)), list(range(keys))
fullkey=tuple(range(keys))
vpos=0
#make a chart
while i2!=p2len:
    renda=0; objmemo=[]; rendalis=[]; unusedlis=[]
    while True:
        p2line=p2lis[i2]
        vpos=p2line[1]
        if quant_u*(mtp-0.5)<=p2lis[i2][1] and p2lis[i2][1]<quant_u*(mtp+0.5):
            if len(objmemo)<keys: objmemo.append(p2line)
            else: etclis.append(p2line)
            i2+=1
        if i2==p2len: break
        elif p2lis[i2][1]>=quant_u*(mtp+0.5): 
            mtp+=1; break
    
    if len(objmemo)==0:
        if reset_memo: keymemo=[] 
    elif len(objmemo)==keys: keymemo=list(range(keys))
    else:
        remnlis=[k for k in fullkey if k not in keymemo]
        #first, determine the # of renda
        if keys<len(keymemo)+len(objmemo): #renda exists
            renda=len(keymemo)+len(objmemo)-keys 
            rendacan=keymemo
            rplcount=0 #renda possible lane count
            for idx in rendacan:
                if idx in pack1: rplcount+=1
            if rplcount<renda: pack0=pack1; pack1=list(range(keys))
            unuseno=len(keymemo)-renda
            pack0chklis=[k for k in rendacan if pack0[k]!=-1]
            #determine renda lane
            if len(pack0chklis)>=renda:
                rendalis=random.sample(pack0chklis, renda)
            else: rendalis=random.sample(rendacan, renda)
            unusedlis=rendalis
            keymemo=rendalis+remnlis
        elif keys==len(keymemo)+len(objmemo):                               
            keymemo=remnlis #pure denim
        else: #find unused key
            unusecan=[k for k in fullkey if k not in keymemo]
            unuseno=keys-len(keymemo)-len(objmemo)
            usecount=0
            for idx in unusecan:
               if idx not in pack1: usecount+=1
            if usecount==unusecan: pack0=pack1; pack1=list(range(keys))
            pack0chklis=[k for k in unusecan if pack0[k]!=-1]
            if len(pack0chklis)>=unuseno:
                unusedlis=random.sample(pack0chklis, unuseno)
            else: 
                pack0uc=[k for k in unusecan if k not in pack0chklis]
                unusedlis=pack0chklis+random.sample(pack0uc, unuseno-len(pack0chklis))
            keymemo=[k for k in unusecan if k not in unusedlis]
        for unused in unusedlis: 
            if unused in pack0: pack0[unused]=-1
            else: pack1[unused]=-1
        if pack0==[-1]*keys: pack0=pack1; pack1=list(range(keys))
    for i in range(len(objmemo)):
        obj=objmemo[i]
        key=keymemo[i]
        obj[0]=lane1+key
        p1lis.append(obj)
#only concatenate p1lis and etclis
allis=p1lis+etclis
allis=Sort(allis)
for sub in allis:   
    ls=len(sub)
    for sub_i in range(ls):
       if sub_i != ls-1: newcl+=str(sub[sub_i])+" "
       else: newcl+=str(sub[sub_i])
    newcl+="\r\n"
win32clipboard.OpenClipboard()
win32clipboard.EmptyClipboard()
win32clipboard.SetClipboardText(newcl[:-2])
win32clipboard.CloseClipboard()
