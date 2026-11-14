/* Orion Lab Studios - studio pages (website privacy, terms, legal notice, accessibility).
   Moved out of the page unchanged on 14 Nov so the Content-Security-Policy needs no inline script. */
(function(){
  var bar=document.getElementById('bar');
  function onScroll(){ if(bar) bar.classList.toggle('solid', window.scrollY>24); }
  onScroll(); window.addEventListener('scroll',onScroll,{passive:true});
  var rv=document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}})},{rootMargin:'0px 0px -8% 0px'});
    rv.forEach(function(el){io.observe(el)});
  } else rv.forEach(function(el){el.classList.add('in')});
  var c=document.getElementById('sky'); if(!c) return;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var x=c.getContext('2d'), stars=[], W=0,H=0, dpr=Math.min(window.devicePixelRatio||1,2), mx=0,my=0,tx=0,ty=0, t0=performance.now();
  var seed=7; function rnd(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;}
  function size(){
    W=c.clientWidth;H=c.clientHeight;c.width=W*dpr;c.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);
    stars=[];seed=7;var n=Math.round(W*H/2600);
    for(var i=0;i<n;i++){var z=rnd();stars.push({x:rnd()*W,y:rnd()*H,z:z,r:.25+z*z*1.5,p:rnd()*6.28,s:.4+rnd()*1.6,
      h:rnd()<.12?'255,214,170':(rnd()<.18?'190,205,255':'255,248,235')});}
  }
  function draw(now){
    var t=(now-t0)/1000; tx+=(mx-tx)*.05; ty+=(my-ty)*.05;
    x.clearRect(0,0,W,H);
    for(var i=0;i<stars.length;i++){var s=stars[i],a=.35+.65*(.5+.5*Math.sin(t*s.s+s.p));
      var px=s.x+tx*s.z*26, py=s.y+ty*s.z*18 - (reduce?0:t*s.z*3)%H; if(py<0)py+=H;
      x.beginPath();x.fillStyle='rgba('+s.h+','+(a*(.35+.65*s.z)).toFixed(3)+')';x.arc(px,py,s.r,0,6.283);x.fill();
      if(s.r>1.35){x.fillStyle='rgba('+s.h+','+(a*.08).toFixed(3)+')';x.beginPath();x.arc(px,py,s.r*4,0,6.283);x.fill();}}
    if(!reduce) requestAnimationFrame(draw);
  }
  window.addEventListener('resize',function(){size();if(reduce)draw(performance.now());});
  window.addEventListener('pointermove',function(e){mx=e.clientX/W-.5;my=e.clientY/H-.5;},{passive:true});
  size(); requestAnimationFrame(draw);
})();
