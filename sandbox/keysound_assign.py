# -*- coding: utf-8 -*-
"""
Created on Sat Aug 28 17:05:27 2021

@author: arctiidae5fury
version: 0
"""
import win32clipboard

###setting###
nk_obj=("ZY",) #list of string, upper case
tolerance=0 #tolerance of vertical deviation (unit: 1/192 measure)
# i.e., tolerance = 6 allows +-1/32 measure of deviation

#lane_pos vertical_pos decimal_obj+"0000" "0 0 0"
##lane_pos 1P S1234567: 4-11, 2P 1234567S: 13-20 
#aim: copy ibmsc data-> read clipboard -> replace non-keysound objects on 1P 
## with objects on 2P -> paste clipboard

charset="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
def ZtoD(x):
    return 36*charset.index(x[0])+charset.index(x[1])
def DtoZ(n):
    return charset.index(n//36)+charset.index(n%36)
def Sort(sub_li):
    return(sorted(sub_li, key = lambda x: x[1]))   
nk_obj_D=list(map(ZtoD, nk_obj))
win32clipboard.OpenClipboard()
cldata = win32clipboard.GetClipboardData()
win32clipboard.CloseClipboard()
clsp=cldata.split("\r\n")
newcl=clsp[0]+'\r\n'
p1klis=[]; p1nklis=[]; p2lis=[]; etclis=[]
for line in clsp[1:]:
    ls=line.split(" ")
    lisp=[int(ls[0]), float(ls[1])]
    for l in ls[2:6]: lisp.append(int(l))
    if 5<=lisp[0] and lisp[0]<=12:
        if lisp[2]//10000 not in nk_obj_D: p1klis.append(lisp)
        else: p1nklis.append(lisp)
    elif 14<=lisp[0] and lisp[0]<=21: p2lis.append(lisp)
    else: etclis.append(lisp)
eps=0.01
for i1 in range(len(p1nklis)):
    nkline=p1nklis[i1]
    vpos=nkline[1]
    rplidx=None; minerr=tolerance+eps
    for i2 in range(len(p2lis)):
        p2l=p2lis[i2]
        err_raw=vpos-p2l[1]; err=abs(err_raw)
        if err<minerr: rplidx=i2; minerr=err;
        elif err_raw<=0: break
    if rplidx!=None:
        p1nklis[i1][1:3]=p2lis[rplidx][1:3]
        p2lis.pop(rplidx);
allis=p1klis+p1nklis+p2lis+etclis
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