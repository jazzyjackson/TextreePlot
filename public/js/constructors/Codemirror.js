function Codemirror(optStringInit,optFileName,startX, startY){

  console.log(arguments)

  Leaf.call(this, startX, startY, 800, 400)
  this.element.className += ' codemirrorContainer'
  var codemirrorList = document.getElementsByClassName('codemirrorContainer')
  this.element.id = 'Codemirror' + nextIdNum('.codemirrorContainer');
  this.element.setAttribute('target',optFileName)
  let thisTitle = this.element.querySelector('.headerTitle');
  thisTitle.textContent = this.element.id;
  thisTitle.textContent += optFileName ? (' > ' + optFileName) : '';
 

  var editButton = this.element.querySelector('.editButton');
  editButton.parentElement.firstChild.textContent = 'Evaluate'

  var codeText = document.createElement('textarea');
  if(optStringInit){
    codeText.value = optStringInit;
  }
  this.element.appendChild(codeText);
  if(typeof CodeMirror === 'undefined'){
    let cssInclude = document.createElement('link')
    cssInclude.setAttribute('rel', 'stylesheet');
    cssInclude.setAttribute('href', '/lib/codemirror.css')
  //  document.head.appendChild(cssInclude);
    let jsInclude = document.createElement('script')
    jsInclude.setAttribute('src', '/lib/codemirror.js')
    jsInclude.setAttribute('defer','true');

    let jsModeInclude = document.createElement('script')
    jsModeInclude.setAttribute('src', '/lib/mode/javascript/javascript.js')
    jsModeInclude.setAttribute('defer','true');

    let cssModeInclude = document.createElement('script')
    cssModeInclude.setAttribute('src', '/lib/mode/css/css.js')
    cssModeInclude.setAttribute('defer','true');
    
    let xmlModeInclude = document.createElement('script')
    xmlModeInclude.setAttribute('src', '/lib/mode/xml/xml.js')
    xmlModeInclude.setAttribute('defer','true');

    let htmlModeInclude = document.createElement('script')
    htmlModeInclude.setAttribute('src', '/lib/mode/htmlmixed/htmlmixed.js')
    htmlModeInclude.setAttribute('defer','true');


    promiseToAppend(cssInclude)
    .then(() => promiseToAppend(jsInclude))
    .then(() => promiseToAppend(jsModeInclude,cssModeInclude,xmlModeInclude))
    .then(() => promiseToAppend(htmlModeInclude))
    .then(()=> {
      this.element.cm = CodeMirror.fromTextArea(codeText, {
        lineNumbers: true,
        mode: "htmlmixed"
      });
      this.element.cm.on('change',broadcastEdits)
    })
    .catch(console.log.bind(console))
  } else {
    //setTimeout mysteriously fixes an issue where codmirror css
    //fails to be be applied to subsequent codemirror divs
    setTimeout(()=>{
      this.element.cm = CodeMirror.fromTextArea(codeText, {
        lineNumbers: true,
        mode: "htmlmixed"
      });
      this.element.cm.on('change',broadcastEdits)
    },10)
  }

  this.render = () => this.element;

}

function promiseToAppend(){
  let ArrayOfTags = Array.from(arguments)
  return new Promise((resolve,reject)=>{
    Promise.race([tryToAppend(ArrayOfTags),timeout(1000)])
    .then((appendSuccess)=>{
      if(appendSuccess){
        resolve('loaded successfully');
      } else {
        reject('failed to load');
      }
    })
  })
}

function tryToAppend(ArrayOfTags){
  let promisesOfAppendment = ArrayOfTags.map(aTag => 
    new Promise( resolve => {
      aTag.addEventListener('load',()=>resolve(true))
      document.head.appendChild(aTag);
    })
  )
  

  return Promise.all(promisesOfAppendment)
}

function timeout(ms){
  return new Promise((resolve)=>{
    setTimeout(()=>resolve(false),ms)
  })
}

function hoist(scriptString){
  let oldScript = document.getElementById('repl');
  oldScript.remove();
  let newScript = document.createElement('script');
  newScript.id = 'repl';
  newScript.textContent = scriptString;
  document.head.appendChild(newScript);
}




// Peripheral functions for codeMirror. Codemirror sync events.
/* There are two types of events to handle:
 * When any user clicks anywhere in the mirror, 
 * a message is socketized containing the line number.
 * The server can match the identity of the send, and broadcast 
 * the line number to be locked. 
 * 
 * On receiving the line number, the clients will use markText, readOnly
 * 
 * When an edit is made, the line number and the string are broadcast
 * clients will clear the marktext, insert the line, and re-mark the text. 
 */
function broadcastPos(theMirror){
  let lineOfCursor = theMirror.getDoc().getCursor().line;
  let mirrorContainer = theMirror.display.wrapper.parentElement.id;
  socket.emit('cursorActivity',{lineOfCursor, mirrorContainer});
  // mark = theMirror.markText({line:lineOfCursor,ch:0},{line:lineOfCursor+1,ch:0},{css: 'background: lightblue',readOnly: true})
  // console.log(lineOfCursor);
}

//this is fired on change
function broadcastEdits(theMirror,changeObj){
  //remote changes have an undefined origin. Only fire socket when change is local.
  if(changeObj.origin){
    let mirrorContainer = theMirror.display.wrapper.parentElement.id;
    let changeFrom = changeObj.from;
    let changeTo = changeObj.to;
    let newContent = changeObj.text;
    socket.emit('mirrorChange',{changeFrom, changeTo,newContent,mirrorContainer});
  }
}

//called from socketevents.js on('changemirror')
function changeMirror(data){
  let {changeFrom, changeTo, newContent, mirrorContainer} = data;
  let leaf = document.getElementById(mirrorContainer);
  let theMirror = leaf.cm
  theMirror.getDoc().replaceRange(newContent,changeFrom,changeTo)
}

console.log(document.readyState)

window.addEventListener('load', ()=>{
  
  console.log(document.readyState)

    console.log('codemirror.js loaded')
    let mirrors = Array.from(document.getElementsByClassName('codemirrorContainer'))
    console.log(mirrors);
    mirrors.forEach(mirrorContainer => {
      let textArea = mirrorContainer.getElementsByTagName('TEXTAREA')[0];
      mirrorContainer.cm = CodeMirror.fromTextArea(textArea, {lineNumbers: true, mode: "htmlmixed"});
      mirrorContainer.cm.on('change',broadcastEdits);
      mirrorContainer.cm.on('cursorActivity',broadcastPos) //Will pass the cm object 
      let possibleUpdate = mirrorContainer.getAttribute('update');
      if(possibleUpdate){
        console.log('connecting to ' + possibleUpdate)
        liveConnect(mirrorContainer.cm,document.getElementById(possibleUpdate))
      } 
    })
})

console.log(document.readyState)
