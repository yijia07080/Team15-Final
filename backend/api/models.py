from django.db import models

# Create your models here.
class Bookmarks(models.Model):
    '''
    account + bid is the unique identifier for each bookmark
    cause django can't use composite primary key, use default primary key (id)
    '''
    account = models.ForeignKey('User', on_delete=models.CASCADE, related_name='bookmarks')
    bid = models.BigIntegerField(unique=True)
    url = models.CharField(max_length=2000)
    img = models.CharField(max_length=500, blank=True)
    name = models.CharField(max_length=200)
    tags = models.JSONField(default=list, blank=True)
    hidden = models.BooleanField(default=False)
    last_modified = models.DateTimeField(auto_now=True)
    file_type = models.CharField(max_length=20)  # root or group or folder or file
    space_providers = models.JSONField(default=None, null=True, blank=True)  # just for file_type = "group" or "file", [provider1, provider2]
    used_size = models.BigIntegerField(default=None, null=True, blank=True)  # just for file_type = "group" or "folder" or "file"
    real_position = models.CharField(max_length=200, default=None, null=True, blank=True)  # just for file_type = "file"

class TreeStructure(models.Model):
    '''
    account + bid is the unique identifier for each bookmark
    cause django can't use composite primary key, use default primary key (id)
    '''
    account = models.ForeignKey('User', on_delete=models.CASCADE, related_name='tree_structure')
    bookmark_foreignkey = models.ForeignKey('Bookmarks', on_delete=models.CASCADE, related_name='tree_structure')
    bid = models.BigIntegerField()  #  id bookmark bid property
    parent_id = models.BigIntegerField(default=None, null=True, blank=True)  # parent_id can be null
    children_id = models.JSONField(default=list, blank=True)

class User(models.Model):
    account = models.EmailField(primary_key=True, max_length=254)
    name = models.CharField(max_length=200)
    picture = models.URLField(blank=True)
    password = models.CharField(max_length=200, blank=True, null=True)
    lastUpdated = models.DateTimeField(auto_now=True)

class Provider(models.Model):
    account = models.ForeignKey('User', on_delete=models.CASCADE, related_name='providers')
    provider_account = models.EmailField(max_length=254)
    provider_name = models.CharField(max_length=200)
    provider_picture = models.URLField(blank=True)
    access_token = models.CharField(max_length=200, blank=True)
    