<?php
    $token = md5(1234567980);
    $users = [
        [
            'id' => 1,
            'name' => 'Vasya'
        ],
        [
            'id' => 2,
            'name' => 'Petya'
        ],
        [
            'id' => 3,
            'name' => 'Katya'
        ],
        [
            'id' => 4,
            'name' => 'Vlad'
        ],
        [
            'id' => 5,
            'name' => 'Sanya'
        ],
    ];
?>
<!DOCTYPE html>
<html>
    <head>
        <title>Bootstrap Example</title>
        <meta charset="utf-8">
        <meta name="token" content="<?=$token?>">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"></script>

        <style>
            video { height: 240px; width: 320px; border: 1px solid grey; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="row">
                <h1>
                    User <span
                    class="auth_user"
                    data-user_id="<?=$_GET['auth_user_id'];?>"
                    data-room="<?=md5($_GET['auth_user_id']);?>"
                    ><?=$users[array_search($_GET['auth_user_id'], array_column($users, 'id'))]['name'];?></span></h1>
            </div>
            <div class="row">
                <ul>
                    <?php foreach($users as $user):
                        if($_GET['auth_user_id'] == $user['id'])
                            continue;
                        $room = [$user['id'], $_GET['auth_user_id']];
                        asort($room);
                        $room = md5(implode('', $room));
                     ?>
                    <li class="__rooms">
                        <?= $user['name']; ?>
                        <button
                            class="select__room"
                            data-room="<?= $room ?>"
                        >Select room</button>
                        <button class="call_offer __user"
                             data-room="<?= $room ?>"
                             data-user_id="<?= $user['id']?>"
                             data-uuid="<?=md5($user['id']);?>"
                             >Call <span class="unread__messages_count"></span>
                         </button>

                    </li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <h3 class="message__info"></h3>
                    <div class="answer_reject_buttons" style="display:none">
                        <button class="call_answer" data-peer_id="" style="">Call answer</button>
                        <button class="call_reject" style="">Call reject</button>
                        <button class="call_hang_up" style="">Call Hangup</button>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="col-md-6">
                        <h3>Local stream</h3>
                        <video id="localVideo" autoplay="true"></video>
                    </div>
                    <div class="col-md-6 remote__videos">
                        <h3>Remote streams</h3>
                    </div>
                </div>
                <div class="col-md-12">
                    <h3>Groups</h3>
                    <div class="__groups">
                        <ul></ul>
                    </div>
                    <form class="create__group__form">
                        <div class="form-group">
                            <select multiple class="form-control" width="30%">
                                <option value="0">
                                    Select user
                                </option>
                                <?php foreach($users as $user):
                                    if($_GET['auth_user_id'] == $user['id'])
                                        continue;
                                 ?>
                                <option
                                    data-user_id="<?=$user['id']?>"
                                    data-uuid="<?=md5($user['id'])?>"
                                >
                                    <?=$user['name']?>
                                </option>
                             <?php endforeach; ?>
                            </select>
                        </div>
                        <button class="btn btn-success">Create group +</button>
                    </form>
                </div>
                <div class="col-md-6">
                    <h3>Send message into room <span class="__room"></span></h3>
                    <form action="" class="chat__form">
                        <div class="form-group">
                            <textarea
                                  rows="4" cols="50"
                                class="__message"></textarea>
                        </div>
                        <button type="submit" class="btn btn-success">Send</button>
                    </form>
                </div>
                <div class="col-md-6">
                    <h3>Chat messages</h3>
                    <ul class="messages__list"></ul>
                </div>
            </div>
        </div>

        <script src="js/socket.io.js"></script>
        <!-- <script src="node/node_modules/socket.io-p2p/socketiop2p.min.js"></script> -->
        <script src="https://cdnjs.cloudflare.com/ajax/libs/peerjs/0.3.16/peer.min.js"></script>
        <script src="js/md5.js"></script>
        <script src="js/chat.js"></script>
    </body>
</html>