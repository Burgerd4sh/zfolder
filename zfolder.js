/* 
    作者：Buergerd4sh
    时间：2023-07
    版本：0.3
    实现方案：Li使用本身, h使用div（包裹h）
    问题：  h使用div的时候逻辑应该没有大错误了，但是在实际测试的时候框架会莫名其妙的将我添加的h标签的父标签给删掉。
            有两种情况：
            一是所见即所得界面中div的所有内容消失，但是源码模式还在
            二是直接造成数据丢失

*/

var imgPath = './zfolder-plugin/down.svg';
let writeNode = document.getElementById('write');                        // 要监听的节点，write节点是typora编辑区的根节点
let config = { attributes: true, childList: false, subtree: false };     // 要监听的节点变化
/* 
    attributes： 属性变化 
    childList：  直接子节点的变化
    subtree：    间接子节点（节点的节点，节点的节点的节点……）
*/

// 初始化事件处理注册，因为在typora的初始化过程中，write节点还没有加载完成，所以需要监听write节点
let observer = new MutationObserver((mutationsList, observer) => {
    let writeNode = mutationsList[mutationsList.length - 1].target;
    if (writeNode.className == "enable-diagrams") {
        initFolder();
        observer.disconnect();
        observer = null;
    }
}
);
observer.observe(writeNode, config);

// 初始化函数
function initFolder(){
    // 设置监听事件，配置监听参数
    let targetNode = document.getElementById('write');                      // 要监听的节点
    const config = { attributes: false, childList: true, subtree: true };   // 要监听的节点变化

    // 事件处理注册
    const observer = new MutationObserver(mutationHandler);
    observer.observe(targetNode, config);

    // 因为此时文件页面已经加载完毕，不会在触发监听事件，所有进行第一次手动初始化
    addLiParser(targetNode);    
    // addHParser(targetNode);
    let img = targetNode.getElementsByTagName('img');
    for(let i of img){
        addImgParser(i.parentNode);
    }
}

function mutationHandler(mutationsList) {
    for (let mutation of mutationsList) {
        switch (mutation.type) {
            case "childList":
            case "subtree":
                /*  删除和添加的先后顺序问题
                    在删除li子ul中的节点的时候，frame.js是同时删除旧的子ul，增加新ul，
                    如果先判断新增再删除的话li的foldContainer会被删除
                */
                // 删除节点事件
                if (mutation.removedNodes != null) {
                    deleteLiParser(mutation);
                    // deleteHParser(mutation);
                }

                // 新增节点事件
                if (mutation.addedNodes != null) {
                    for (let node of mutation.addedNodes) {
                        addLiParser(node);
                        addImgParser(node);
                        // addHParser(node);
                    }   
                }
                break;
            case "attributes":
                break;
            default:
                alert("zfolder.js mutationHandler Error! Type error!");
                break;
        }
    }
}

// 新增Li系函数
function addLiParser(node){
    // 父节点新增判断（撤销的时候）
    let parentNode = node.parentNode;
    if(parentNode && parentNode.nodeName == 'LI' && !parentNode.classList.contains('foldContainer')){
        createLiFolder(parentNode);
    }

    // 新增节点判断
    if(node.nodeName == "LI" && liHasChildrenContent(node)){
        createLiFolder(node);
    }

    // 子元素判断
    if(!node.children)
        return
    let liList = node.getElementsByTagName("li");
    for(let li of liList){
        if(liHasChildrenContent(li)){
            createLiFolder(li);
        }
    }
}

function liHasChildrenContent(li){
    /* 判断li是否有除了第一个p以外的内容 */
    let minNum = 1;     // 当是无序列表的时候，li的直接子标签只有一个p标签
    if(li.firstChild.nodeName == 'INPUT'){
        minNum += 1;     // 当是任务列表的时候，li的直接子标签多一个input
    }
    if(li.getElementsByClassName('foldButton').length != 0)
    {
        minNum += 1
    }
    if(li.children.length > minNum)
        return true;
    else
        return false;
}

function createLiFolder(li){
    /* 将传入的li变成折叠容器 */
    // 设置属性
    li.classList.add("foldContainer", "unfold");

    // 添加图标
    let img = document.createElement("img");
    img.className = 'foldButton';
    img.src = imgPath;
    img.onclick = ulfold;
    let pList = li.getElementsByTagName('p');   // 如果插入到第一个p前面，删除该li的时候会报错（不知道插入到后续的p前面会不会报错）
    li.insertBefore(img, pList[0].nextSibling);
}

function ulfold(){
    let container = this.parentNode;
    if (container.classList.contains("unfold")) {
        this.style.transform = 'rotate(-90deg)';
        container.classList.remove("unfold");
        container.classList.add("fold");
    }
    else if (container.classList.contains("fold")) {
        this.style.transform = 'rotate(0)';
        container.classList.remove("fold");
        container.classList.add("unfold");
    }
    else {
        alert("Error!zfold.js需要的折叠class缺失！");
    }
}

// 删除Li系函数
function deleteLiParser(mutation){
    let targetNode = mutation.target;
    if(targetNode.nodeName == 'LI' && targetNode.classList.contains("foldContainer")){    // 如果是折叠容器删除了东西
        if(!liHasChildrenContent(targetNode)){                                            // 删到不包含更多内容的时候就删除container
            let imgList = targetNode.getElementsByClassName('foldButton');
            if(imgList){
                for(let img of imgList){
                    img.remove();
                }
            }                 
            targetNode.classList.remove("foldContainer", "unfold", "fold");
        }
    }
}

// 新增img函数
function addImgParser(node){
    if(node.nodeName == 'SPAN'){
        let attributesValue = node.getAttribute('md-inline');
        if(attributesValue.includes('image') || attributesValue.includes('imgtag')){
            let parentP = node.parentNode;
            parentP.classList.add("foldContainer", "unfold");

            // 添加按钮
            let img = document.createElement('img');
            img.className = 'foldButton';
            img.src = imgPath;
            img.onclick = imgFold;

            parentP.appendChild(img);
        }
        
    }
}

function imgFold(){
    let container = this.parentNode;
    if (container.classList.contains("unfold")) {
        this.style.transform = 'rotate(-90deg)';
        container.classList.remove("unfold");
        container.classList.add("fold");
    }
    else if (container.classList.contains("fold")) {
        this.style.transform = 'rotate(0)';
        container.classList.remove("fold");
        container.classList.add("unfold");
    }
}


// // 新增h系函数
// function addHParser(node){
//     let hRegExp = /^H[1-6]$/;
//     if(hRegExp.test(node.nodeName)){
//         // 测试createHFloder用
//         // if(node.parentNode && !node.parentNode.classList.contains("foldContainer")){
//         //     createHFloder(node);
//         // }
        
//         if(!node.parentNode){   // 因为是延迟检测事件，所以有的时候新增的节点又被删掉了
//             return;
//         }
//         let parentNode = node.parentNode;
//         if(!parentNode.classList.contains("foldContainer")){   // 没有母容器，说明是新建立的
//             createHFloder(node);
//         }
//         else{                                                  // 有母容器的情况
//             let hFirst = parentNode.firstChild;
//             if(hFirst == node){                                // 如果容器的第一个h就是自己，说明可能是是本js的操作引起的事件
//                 return;
//             }
//             // md这里的逻辑写的乱七八糟的
//             else{                                              // 如果容器的第一个h不是自己，说明需要进行等级分析了
//                 createHFloder(node);
//                 while(hLevelCompare(node, hFirst)){            // 进行等级分析，如果容器比新增h高级，则停止，否则就升阶
//                     hLevelUp(node, hFirst);
//                     let hNowContainerParent = node.parentNode.parentNode;
//                     if(hNowContainerParent.classList.contains('foldContainer') && hRegExp.test(hNowContainerParent.firstChild.nodeName)){    // 如果升阶后还在一个容器内
//                         hFirst = hNowContainerParent.firstChild;
//                     }
//                     else{
//                         // 如果不在容器内了
//                         break;
//                     }
//                 }
//             }   
//         }
//     }
// }

// function hLevelCompare(hNow, hBefore){
//     if(hBefore.nodeName[1] > hNow.nodeName[1]){ 
//         return false;      
//     }
//     return true;
// }

// function hLevelUp(hNow, hBefore){
//     /*
//         hNow：新增的h节点
//         hBefore：新增h所在container的h标签
//     */
//     let hRegExp = /^H[1-6]$/;
//     let hBeforeContainer = hBefore.parentNode;                      // hBefore的容器
//     let hNowContainer = hNow.parentNode;                            // hNow的容器
//     let hBeforeContainerParent = hBefore.parentNode.parentNode;     // hBefore容器的父节点

//     // 先插到hBeforeContainer后面
//     hBeforeContainerParent.insertBefore(hNowContainer, hBeforeContainer.nextElementSibling);

//     // 将后面的内容纳入
//     let nextElementSibling = hNowContainer.nextElementSibling;
//     for(;nextElementSibling;){
//         if(hRegExp.test(nextElementSibling.firstChild.nodeName) && nextElementSibling.firstChild.nodeName[1] <= hNow.nodeName[1]){
//             // 如果下一个节点是hDiv容器，并且级别比本容器高的话
//             break;
//         }
//         let addNode = nextElementSibling;
//         nextElementSibling = addNode.nextElementSibling
//         hNowContainer.appendChild(addNode);
//     }
// }

// function createHFloder(h){
//     let hRegExp = /^H[1-6]$/;           // 正则匹配标签名
    
//     // 创建容器
//     let div = document.createElement('div');
//     div.classList.add("foldContainer", "unfold");
//     // 创建按钮
//     let img = document.createElement('img');
//     img.className = 'foldButton';
//     img.src = imgPath;
//     img.onclick = fold;

//     // 容器内容添加
//     let nextElementSibling = h.nextElementSibling;
//     h.parentNode.insertBefore(div, h.nextElementSibling);
//     div.appendChild(h);
//     div.appendChild(img);

//     for(;nextElementSibling;){
//         if(nextElementSibling.firstChild && hRegExp.test(nextElementSibling.firstChild.nodeName) && nextElementSibling.firstChild.nodeName[1] <= h.nodeName[1]){
//             // 如果下一个节点是hDiv容器，并且级别比本容器高的话
//             break;
//         }
//         if(hRegExp.test(nextElementSibling.nodeName) && nextElementSibling.nodeName[1] <= h.nodeName[1]){
//             // 如果下一个节点是还没有创建容器的h标签，且下一个节点的等级比本容器的h标签等级高的话
//             break;
//         }
//         let addNode = nextElementSibling;
//         nextElementSibling = addNode.nextElementSibling
//         div.appendChild(addNode);
//     }
// }

// // 删除h系函数
// function deleteHParser(mutation){
//     if(mutation.target.classList.contains('foldContainer')){    
//         let hRegExp = /^H[1-6]$/;
//         for(let node of mutation.removedNodes){
//             if(hRegExp.test(node.nodeName)){
//                 let divContainer = mutation.target;
//                 let parentNode = divContainer.parentNode;

//                 // 删除img按钮
//                 let imgList = divContainer.getElementsByClassName('foldButton');
//                 if(imgList){
//                     for(let img of imgList){
//                         img.remove();
//                     }
//                 }

//                 // 将所有子元素移出
//                 while(divContainer.firstChild){
//                     parentNode.insertBefore(divContainer.firstChild, divContainer);
//                     // parentNode.appendChild(divContainer.firstChild);
//                 }

//                 // 删除容器
//                 divContainer.remove();
//                 return;
//             }
//         }

//     }
// }



