---
layout: post
title: 'Diaclone: Transformers for Error Detection in Symbolic Music'
published: true
---

This site documents the code of **Diaclone**, a set of experiments in training transformer networks to perform error-detection and error-correction tasks on monophonic symbolic music.

All editable parameters for both training and testing are controlled by `transformer_params.py`. A single set of parameters fully defines a train/test experiment, so that different parameter files can be swapped out to perform different experiments.

A quick summary of the process to train a new model:

1. Set data paths, architecture, hyperparameters in `transformer_params.py`.
2. Run `data_management/make_hdf5.py` to make an `.hdf5` file out of the training data (this only needs to be done once per dataset).
3. Run `transformer_errors_train.py`.

## Data Preparation

Symbolic music must be processed from `.krn` or `.midi` files into a `.hdf5` file for training. This processing is done by the `data_management/make_hdf5.py` script.  The resulting `.hdf5` file will contain each file of the input indexed as a two-dimensional array of integers under the path `corpus_name/file_name.` The columns of each entry contain `(MIDI Pitch, Onset time, Duration)` for each note. This intermediate representation is transformed into trainable representations on the fly during training.

Relevant parameters:

- `raw_data_paths`: A dictionary linking corpus names to directories.
- `validate_proportion`: Amount of dataset to use for validation (spread evenly across all corpora).
- `validate_proportion`: Amount of dataset to use for validation (spread evenly across all corpora).
- `beat_multiplier`: All durations and onset times are multiplied by this number and then rounded to the nearest integer.

### Run-Length
For this representation, each note comprises two one-hot vectors concatenated together: one for pitch, and one for duration. The pitch vector is simple enough, since we can represent it as we would any categorical data. We add an extra feature to represent rest events.

Duration is more tricky; a huge number of note durations are possible but only a fraction of the possible durations are actually used. So, in `get_tick_deltas_for_runlength()`, we find out what the most common note durations are throughout the dataset, and one-hot encode to those (the number of durations used is set in the parameters file as `num_dur_vals`). Any duration that is not in the `num_dur_vals` most common durations is rounded to the nearest common duration. We also concatenate four additional features (defined in `params.FLAGS`) to represent beginnings and endings of songs, masked elements, and padded elements.

The function `arr_to_mono_runlength()` creates the one-hot vectors for each input, and concatenates pitch and duration together. 

So, the runlength representation will have a total length of: 

`pitch_range_of_dataset + 1 + num_dur_vals + len(FLAGS)`

Relevant parameters:

- `num_dur_vals`: The number of most common duration values to return when collecting statistics. If this is larger than the number of total unique duration values found in the corpus, then some features in the resulting representation will always be 0 (a warning will be displayed if this is the case). For reference, the total number of unique duration values in the Essens and Meertens tune collections is 21.
- `FLAGS:` Defines the placement of four additional flags at the end of the duration vector. These flags are `eos` (end of sequence), `sos` (start of sequence), `pad` (padding elements), and `mask` (masked elements).

### Note-Tuple
The Note-Tuple is a MIDI-like representation of symbolic music, where each note is represented as an ordered 4-tuple of the form `(MIDI pitch, voice, delta from previous event, duration)`.


## Model Architecture

There are two possible models, both taking the same parameters: A bidirectional _transformer encoder_, and a  _transformer encoder-decoder_.

The transformer encoder is modelled after the architecture used in [the well-known BERT language model.](https://arxiv.org/abs/1810.04805). It consists of a stack of transformer encoders with two feed-forward layers at the beginning and end. The positional encoding mechanism used is identical to the one found in the PyTorch examples. Because it has no decoder, this model can only produce output sequences of the exact same length as its inputs.

The encoder-decoder is described in `transformer_full_seq_model.py`. It is a fairly minimal wrapper around [the PyTorch default "all-in-one" transformer module](https://pytorch.org/docs/stable/generated/torch.nn.Transformer.html). The inputs and targets are both passed through their own one-layer feed-forward networks before entering the transformer, and the transformer's output is passed through another one-layer network to return it to the size of the input embedding. The positional encoding mechanism used is again identical to the one found in the PyTorch examples. For further information about the inner workings of an encoder-decoder transformer sequence model, refer to [The Illustrated Transformer](http://jalammar.github.io/illustrated-transformer/).

The dimensionality of the input must be specified upon creation of the model (in the argument `num_feats`, but the number of features depends on the specific dataset and encoding type used (e.g. when using the runlength encoding that requires gathering statistics on the dataset before training).

Relevant Parameters:
- `d_model`: Dimension of the transformer's attention mechanism.
- `hidden`: Dimension of each transformer encoder/decoder's feed-forward layer.
- `nlayers`: Number of encoder/decoder layers in the transformer.
- `nhead`: Number of attention heads (`d_model` must be divisible by this number).
- `dropout`: Dropout probability.


### Masking

Two distinct types of masking are used in this Transformer implementation; memory masks and padding masks. (N is the number of input sequences; S is the length of the input sequences; T is the length of the target sequences.)

Memory masking is used to prevent elements at certain positions in a sequence from attending to elements at other positions; for the source sequences, this is a matrix of shape (S, S) and for the targets it is a matrix of shape (T, T). The archetypal example of this is the "square subsequent mask," which looks a little like a descending staircase; it prevents any sequence element from attending to elements that come subsequent to it, and is used in tasks where the goal is to predict future members of a sequence given past values. For our purposes, we want to prevent elements from attending to their own past states (since the goal is to reconstruct every element from context) so we use point-masks instead. This mask forces the model to reconstruct every sequence element from those around it, without the ability to look at the elements themselves. See the `make_point_mask` method inside the `TransformerModel` class.

![pointmask.png](https://raw.githubusercontent.com/timothydereuse/timothydereuse.github.io/master/_posts/pointmask.png) ![Subsequentmask.png](https://raw.githubusercontent.com/timothydereuse/timothydereuse.github.io/master/_posts/Subsequentmask.png)

Padding masks are used to prevent sequence elements from attending to padding elements that have been concatenated onto the end or beginning of a sequence to bring it up to the necessary length for a batch. Since different sequences in a single batch can have different amounts of padding, these are generated per-batch, on the fly. See the `make_len_mask` method inside the `TransformerModel` class.

![An example of a padding mask.](https://raw.githubusercontent.com/timothydereuse/timothydereuse.github.io/master/_posts/paddingmask.png)
