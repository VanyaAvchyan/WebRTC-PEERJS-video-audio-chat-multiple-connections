;

$(function () {
    var token = $('meta[name=token]').attr("content");
    if(!token)
    {
        alert('Token is missing');
        return;
    }

    $.ajax({
        type:"post",
        url: 'http://localhost:4000/token',
        contentType: 'application/json',
        data: JSON.stringify({token:token}),
        dataType: 'json',
        cache: false,
        timeout: 1000,
        success: function(response){
            console.log( "CSRF token set success", response );
            initChat();
        },
        error: function(jqXHR, textStatus, errorThrown){
            console.log('CSRF token set error ' + textStatus + " " + errorThrown);;
        }
    });
    // Init chat part
    function initChat()
    {
        window.navigator.getUserMedia = navigator.getUserMedia ||
                                 navigator.webkitGetUserMedia ||
                                 navigator.mozGetUserMedia;
        window.URL = URL || webkitURL || mozURL;
        window.active_call_data = {};
        window.active_call_data.remote_peer_ids = [];
        var UUID = $('.auth_user').data('room');
        var auth_user_id = $('.auth_user').data('user_id');
        var localVideo = document.getElementById('localVideo');
        var socket = io.connect('http://localhost:4000?token='+token+'&room='+UUID);
        // Connect to peer signaling server
        var peer = new Peer({
            host: 'localhost',
            port: 9000,
            path: '/peerjs',
            key: token,
        });
        active_call_data.peer = peer;
        /**
         * Socket listeners
         */
        // Socket io connection listeners
        socket.on('connect', function() {
            socket.emit('join_room',
                {
                    "room" : UUID,
                    "users" : {
                        "user_id" : auth_user_id,
                        "UUID"    : UUID
                    }
                }
            );
            // Select rooms and send emit to join_room
            $('.__user').each(function(k,el)
            {
                var room = $(el).data('room'); // room name
                var user_id = $(el).data('user_id'); // user into room
                var user_UUID = $(el).data('uuid'); // user into room

                if(!room)
                {
                    console.log("Room is empty");
                    return;
                }
                var users = [
                    {
                        "user_id": auth_user_id,
                        "UUID"   : UUID
                    },
                    {
                        "user_id": user_id,
                        "UUID"   : user_UUID
                    }
                ];
                socket.emit('join_room', {room : room, users: users});
            });
            peer.on('open', function(peer_id) {
                var data = {user_id: auth_user_id, UUID : UUID, peer_id: peer_id};
                socket.emit('peer-connection', data);
                console.log('Peer connect success', peer_id);
                active_call_data.peer_id = peer_id;
                console.log("peer_id");
                console.log(peer_id);
            });
            console.log('socket connect success');
        });
        // Socket call_busy listener
        socket.on('call_busy', function(data)
        {
            hangUp(data.message);
        });

        // Socket call-hang-up listener
        socket.on('call-hang-up', function(data)
        {
            hangUp();
        });

        // Socket chat_message listener
        socket.on('chat_message', function(data)
        {
            if(active_call_data.room == data.room)
            {
                var li = "<li>"+data.message+"</li>";
                $('.messages__list').append(li);
                $('.chat__form button[type=submit]').attr('disabled', false);
                return;
            }
            //unread__messages_count
            var user = $('.__user[data-room='+data.room+'] .unread__messages_count');
            var unread_msgs_cnt = +user.text();
            user.text(++unread_msgs_cnt);
        });

        // Socket join_room_group listener
        socket.on('join_room_group', function(data)
        {
            socket.emit('join_room', data);
            addGroup(data.room, data.room_name);
            console.log('join_room_group', data);
        });

        // Socket call_offer listener
        socket.on('call_offer'+UUID, function(data)
        {
            if(hasActiveCall())
            {
                data.message = 'Room is busy';
                socket.emit('call_busy', data);
                return;
            }
            $('.answer_reject_buttons').show();
            $('.call_hang_up').attr('data-peer_id', data.peer_id);
            $('.call_answer').attr('data-peer_id' , data.peer_id);
            $('.call_answer').attr('disabled' , false);
            $('.message__info').text('Incoming call from '+data.from+' into room '+data.room);
            console.log('call offer get');
        });
        // Socket remote_peers listener
        socket.on('remote_peers', function (active_call)
        {
            if(active_call_data.remote_peer_ids.length > 1)
            {
                socket.emit('remote_peers', active_call_data);
            }

            console.log(' ======== remote_peers ===== ');
            console.log(active_call);
            for(var i = 0; i < active_call.remote_peer_ids.length; i++)
            {
                console.log(' ======== 11111 ===== ');
                var remote_peer_id = active_call.remote_peer_ids[i];
                if(active_call_data.peer_id == remote_peer_id)
                    continue;
                console.log(' ======== 222222 ===== ');
                var call = active_call_data.peer.call(remote_peer_id, active_call_data,stream);
                call.on('stream', function(remoteStream)
                {
                    window.active_call_data.call = call;
                    $('#localVideo').attr('src', URL.createObjectURL(stream));
                    var remoteVideoElement = $('<video />', {
                            id: call.id,
                            src: URL.createObjectURL(remoteStream),
                            autoplay: true
                        });
                    remoteVideoElement.appendTo($('.remote__videos'));
                });
                call.on('close', function(){
                    hangUp();
                });
            }
        });
        /**
         * Click and submit events
         */
        // Button call_offer click
        $(document).on('click', '.call_offer', function()
        {
            if(hasActiveCall())
            {
                $('.message__info').text('You are already busy');
                console.log('You are already busy');
                return;
            }
            active_call_data.room = $(this).data('room');
            if(!active_call_data.peer_id || !active_call_data.room)
            {
                console.log('peer_id or room not set', active_call_data); return;
            }
            socket.emit('call_offer', {room : active_call_data.room, from : UUID, peer_id:active_call_data.peer_id});
            call_offer();
            $('.answer_reject_buttons').show();
            $('.call_answer').hide();
            $('.call_reject').hide();
            $('.call_hang_up').attr('data-peer_id', active_call_data.peer_id);
            console.log('call offer sent');
        });

        // Button call_answer click
        $('.call_answer').on('click', function()
        {
            var to = $(this).data('peer_id');
            if(to)
            {
                answer(to);
                $('.call_answer').attr('disabled', true);
                return;
            }
            console.log('answer peer id denied');
        });

        // Button call_hang_up click
        $('.call_hang_up').on('click', function(){
            hangUp();
            console.log('Button call_hang_up is incorrect', active_call_data);
        });

        // Form chat__form submit
        $('.chat__form').on('submit', function(e){
            e.preventDefault();
            if(!active_call_data.room)
            {
                alert('Select room');
                return;
            }
            var message = $(this).find('.__message').val();
            if(!message)
                return;
            socket.emit('chat_message', {
                "room"  : active_call_data.room,
                "from"    : UUID,
                "message" : message
            });
            $(this).find('button[type=submit]').attr('disabled', true);
            $(this).find('.__message').val('');
        });

        // Button select__room click
        $(document).on('click', '.select__room', function(){
            active_call_data.room = $(this).data('room');
            $('.__room').text(active_call_data.room);
        });

        // From  create__group__form submit
        $('.create__group__form').on('submit', function(e){
            e.preventDefault();

            var users = $(this).find('option:selected');
            if(!users.length)
            {
                console.log('Group is empty');
                return;
            }
            var room = [auth_user_id];
            var room_name = auth_user_id;
            var room_users = [
                {
                    "user_id"  : auth_user_id,
                    "UUID"     : UUID,
                    "id_admin" : true
                }
            ];

            for(var i=0; i < users.length; i++)
            {
                var user_id = $(users[i]).data('user_id');
                room.push(user_id);
                room_name += ','+user_id;
                room_users.push (
                    {
                        "user_id"  : user_id,
                        "UUID"     : md5(user_id.toString()),
                        "is_admin" : false
                    }
                );
            }
            room.sort();
            room = md5(room.join(""));
            if(is_room(room))
            {
                alert('You already have such room');
                return;
            }
            socket.emit('join_room_group', {
                room      : room,
                room_name : room_name,
                users     : room_users
            });
        });

        /**
         * Functions
         */
        function is_room(room)
        {
            return $(document).find('.__rooms [data-room='+room+']').length;
        }
        function addGroup(room, room_name)
        {
            var selectedGroupButtons =
                    `<li class="__rooms">
                        <button
                            class="select__room"
                            data-room="${room}"
                        >Select group ${room_name}</button>
                        <button class="call_offer __user"
                             data-room="${room}"
                             data-user_ids="${room_name}"
                             >Call <span class="unread__messages_count"></span>
                         </button>
                     </li>`;
            $('.__groups ul').append(selectedGroupButtons);
        }


        function answer(to)
        {
            navigator.getUserMedia({audio: true, video: true},
            function(stream)
            {
                var call = peer.call(to, stream);
                call.on('stream', function(remoteStream)
                {
                    console.log('Zangox');
                    window.active_call_data.call = call;
                    $('#localVideo').attr('src', URL.createObjectURL(stream));
                    var remoteVideoElement = $('<video />', {
                            id: call.id,
                            src: URL.createObjectURL(remoteStream),
                            autoplay: true
                        });
                    remoteVideoElement.appendTo($('.remote__videos'));
                });
                call.on('close', function(){
                    hangUp();
                });
            }, function() {
                alert("Error! Make sure to click allow when asked for permission by the browser");
            });
        }

        function call_offer()
        {
            peer.on('call', function(call)
            {
                window.active_call_data.call = call;
                active_call_data.remote_peer_ids.push(call.id);

                navigator.getUserMedia({video: true, audio: true},
                    function(stream)
                    {
                        call.answer(stream);
                        call.on('stream', function(remoteStream)
                        {
                            console.log('Patasxanox');
                            $('#localVideo').attr('src', URL.createObjectURL(stream));
                            var remoteVideoElement = $('<video />', {
                                id: call.id,
                                src: URL.createObjectURL(remoteStream),
                                autoplay: true
                            });
                            remoteVideoElement.appendTo($('.remote__videos'));
                        });
                        call.on('close', function(){
                            hangUp();
                        });
                    }, function(err) {
                        console.log('Failed to get local stream' , err);
                    });
            });
        }

        function hasActiveCall()
        {
            if(active_call_data.call)
            {
                return "Cal already exists";
            }
            return false;
        }
        function hangUp(msg)
        {
            if(active_call_data.call)
            {
                active_call_data.call.close();
                active_call_data.call = null;
            }
            $('.answer_reject_buttons').hide();
            $('.remote__videos video').remove();
            $('.call_answer').show();
            $('.call_reject').show();
            localVideo.src = '';
            $('.message__info').text('');
            if(msg)
                $('.message__info').text(msg);
            $('.call_offer').attr('disabled',false);
            socket.emit('call-hang-up', {"from": UUID, "room" : active_call_data.room});
            active_call_data.room = null;
        }
    }
    getUserMedia();
    function getUserMedia()
    {
        navigator.getUserMedia({video: true, audio: true},
            function(stream) {
                active_call_data.stream = stream;
            },
            function(err) {});
    }

});