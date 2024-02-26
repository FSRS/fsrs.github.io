# -*- coding: utf-8 -*-

"""
Created on Sat Aug 28 17:05:27 2021

@author: arctiidae5fury
version: 0
"""
import win32clipboard

###setting###
quantize_unit=0.25 #quantize unit (unit: 1.0 = 1/192 measure)
# i.e., quantize_unit=0.25 uses 1/768 measure of quantizing

#lane_pos vertical_pos decimal_obj+"0000" "0 0 0"
#aim: copy ibmsc data-> read clipboard -> round off the vertical pos

charset="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
def ZtoD(x):
    return 36*charset.index(x[0])+charset.index(x[1])
def DtoZ(n):
    return charset.index(n//36)+charset.index(n%36)
def Sort(sub_li):
    return(sorted(sub_li, key = lambda x: x[1])) 
def quantize(pos):
    return round(pos/quantize_unit)*quantize_unit

win32clipboard.OpenClipboard()
cldata = win32clipboard.GetClipboardData()
win32clipboard.CloseClipboard()
clsp=cldata.split("\r\n")
newcl=clsp[0]+'\r\n'
objlis=[]
for line in clsp[1:]:
    ls=line.split(" ")
    
    lisp=[int(ls[0]), float(ls[1]), int(ls[2])] #make str to int or floar
    if '.' not in ls[3]: lisp.append(int(ls[3]))
    else: lisp.append(float(ls[3]))
    for l in ls[4:6]: lisp.append(int(l))
    
    objlis.append(lisp)

for obj in objlis:
    obj[1]=quantize(obj[1])
    
allis=Sort(objlis)
for sub in allis:   
    ls=len(sub)
    for sub_i in range(ls):
       if sub_i in (1,3) : newcl+="%.1f "%sub[sub_i]
       elif sub_i != ls-1: newcl+=str(sub[sub_i])+" "
       else: newcl+=str(sub[sub_i])
    newcl+="\r\n"
    
win32clipboard.OpenClipboard()
win32clipboard.EmptyClipboard()
win32clipboard.SetClipboardText(newcl[:-2])
win32clipboard.CloseClipboard()